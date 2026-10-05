-- Opt-in only. Delivery runs separately from catalogue/tasting writes and page loads.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema push_private;
revoke all on schema push_private from public, anon, authenticated;
grant usage on schema push_private to service_role;

create table push_private.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 4096),
  p256dh text not null,
  auth text not null,
  device_token uuid not null,
  enabled_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_delivered_at timestamptz
);
create index push_subscriptions_user_idx on push_private.subscriptions (user_id);
alter table push_private.subscriptions enable row level security;
revoke all on push_private.subscriptions from public, anon, authenticated, service_role;

-- Encrypted at rest; never copied to a migration, frontend bundle or Cron command.
select vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'pivnik_push_dispatch_token');

create function push_private.configuration() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_object_agg(
    case name when 'pivnik_push_public_key' then 'public_key'
      when 'pivnik_push_private_key' then 'private_key' else 'dispatch_token' end,
    decrypted_secret)
  from vault.decrypted_secrets
  where name in ('pivnik_push_public_key', 'pivnik_push_private_key', 'pivnik_push_dispatch_token');
$$;

create function push_private.register(p_user_id uuid, p_endpoint text, p_p256dh text, p_auth text, p_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Edge verified Auth ID and browser-owned endpoint. Rebinding a shared phone
  -- replaces the previous account instead of leaving two recipients behind.
  insert into public.navigation_reads(user_id) values (p_user_id) on conflict do nothing;
  insert into push_private.subscriptions(user_id, endpoint, p256dh, auth, device_token)
  values(p_user_id, p_endpoint, p_p256dh, p_auth, p_token)
  on conflict(endpoint) do update set
    user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    device_token = excluded.device_token, enabled_at = now(), last_active_at = now(),
    last_attempt_at = case when push_private.subscriptions.user_id = excluded.user_id then push_private.subscriptions.last_attempt_at else null end,
    last_delivered_at = null;
end;
$$;
create function push_private.status(p_user_id uuid, p_endpoint text) returns boolean
language sql security definer set search_path = '' as $$
  select exists(select 1 from push_private.subscriptions where user_id = p_user_id and endpoint = p_endpoint);
$$;
create function push_private.manage(p_user_id uuid, p_endpoint text, p_disable boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_disable then
    delete from push_private.subscriptions where user_id = p_user_id and endpoint = p_endpoint;
  else
    update push_private.subscriptions set last_active_at = now()
      where user_id = p_user_id and endpoint = p_endpoint;
  end if;
end;
$$;

create function push_private.has_news(p_user_id uuid, p_since timestamptz) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.navigation_reads r where r.user_id = p_user_id and (
      exists(select 1 from public.catalog_events e where e.show_in_timeline = true
        and e.actor_user_id <> p_user_id and e.created_at > p_since and e.created_at <= now()
        and (
          (e.event_type <> 'beer_confirmed' and e.created_at > greatest(r.activity_seen_at, now() - interval '3 months'))
          or (e.event_type = 'beer_created' and e.beer_id is not null and e.created_at > r.beers_seen_at)
          or (e.event_type = 'brewery_created' and e.brewery_id is not null and e.created_at > r.breweries_seen_at)
        ))
      or exists(select 1 from public.tastings t where t.show_in_timeline = true and t.user_id <> p_user_id
        and t.tasted_on >= ((now() - interval '3 months') at time zone 'UTC')::date
        and t.created_at > greatest(p_since, r.activity_seen_at) and t.created_at <= now())
      or exists(select 1 from public.user_achievements a where a.show_in_timeline = true and a.user_id <> p_user_id
        and a.unlocked_at > greatest(p_since, r.activity_seen_at, now() - interval '3 months') and a.unlocked_at <= now())
    )
  );
$$;

create function push_private.claim() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_now timestamptz := now();
  v_rows jsonb := '[]'::jsonb;
begin
  -- Night-time quiet hours in the user's application's local timezone.
  if extract(hour from v_now at time zone 'Europe/Prague') not between 8 and 21 then return v_rows; end if;
  for v_user in select user_id from push_private.subscriptions group by user_id
    having max(last_active_at) < v_now - interval '10 minutes'
      and (max(last_attempt_at) is null or max(last_attempt_at) <= v_now - interval '24 hours')
      and bool_or(push_private.has_news(user_id, greatest(enabled_at, coalesce(last_delivered_at, enabled_at))))
    order by user_id limit 50
  loop
    if not pg_try_advisory_xact_lock(hashtextextended('pivnik-push-' || v_user::text, 0)) then continue; end if;
    -- Recheck after the account lock: only one reservation per account / 24h,
    -- shared by all installed devices, even across overlapping jobs.
    if exists(select 1 from push_private.subscriptions where user_id = v_user and
      (last_attempt_at > v_now - interval '24 hours' or last_active_at >= v_now - interval '10 minutes')) then continue; end if;
    if not exists(select 1 from push_private.subscriptions s where s.user_id = v_user
      and push_private.has_news(v_user, greatest(s.enabled_at, coalesce(s.last_delivered_at, s.enabled_at)))) then continue; end if;
    with reserved as (
      update push_private.subscriptions set last_attempt_at = v_now where user_id = v_user
        returning id, endpoint, p256dh, auth, device_token, last_attempt_at as claimed_at
    ) select v_rows || coalesce(jsonb_agg(to_jsonb(reserved)), '[]'::jsonb) into v_rows from reserved;
  end loop;
  return v_rows;
end;
$$;
create function push_private.finish(p_id uuid, p_token uuid, p_claimed_at timestamptz, p_expired boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_expired then
    delete from push_private.subscriptions where id = p_id and device_token = p_token and last_attempt_at = p_claimed_at;
  else
    update push_private.subscriptions set last_delivered_at = p_claimed_at
      where id = p_id and device_token = p_token and last_attempt_at = p_claimed_at;
  end if;
end;
$$;

-- These RPC wrappers expose no privileged operation to user or anonymous roles.
-- All elevated work is kept in the unexposed private schema.
create function public.push_news_configuration() returns jsonb language sql security invoker set search_path = '' as $$ select push_private.configuration(); $$;
create function public.register_push_news(p_user_id uuid, p_endpoint text, p_p256dh text, p_auth text, p_token uuid) returns void language sql security invoker set search_path = '' as $$ select push_private.register(p_user_id, p_endpoint, p_p256dh, p_auth, p_token); $$;
create function public.push_news_status(p_user_id uuid, p_endpoint text) returns boolean language sql security invoker set search_path = '' as $$ select push_private.status(p_user_id, p_endpoint); $$;
create function public.manage_push_news(p_user_id uuid, p_endpoint text, p_disable boolean) returns void language sql security invoker set search_path = '' as $$ select push_private.manage(p_user_id, p_endpoint, p_disable); $$;
create function public.claim_push_news() returns jsonb language sql security invoker set search_path = '' as $$ select push_private.claim(); $$;
create function public.finish_push_news(p_id uuid, p_token uuid, p_claimed_at timestamptz, p_expired boolean) returns void language sql security invoker set search_path = '' as $$ select push_private.finish(p_id, p_token, p_claimed_at, p_expired); $$;
revoke all on all functions in schema push_private from public, anon, authenticated;
grant execute on all functions in schema push_private to service_role;
revoke all on function public.push_news_configuration(), public.register_push_news(uuid,text,text,text,uuid),
  public.push_news_status(uuid,text), public.manage_push_news(uuid,text,boolean), public.claim_push_news(),
  public.finish_push_news(uuid,uuid,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.push_news_configuration(), public.register_push_news(uuid,text,text,text,uuid),
  public.push_news_status(uuid,text), public.manage_push_news(uuid,text,boolean), public.claim_push_news(),
  public.finish_push_news(uuid,uuid,timestamptz,boolean) to service_role;

create function push_private.dispatch() returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'pivnik-push-news')
    and end_time < now() - interval '7 days';
  if extract(hour from now() at time zone 'Europe/Prague') not between 8 and 21 then return; end if;
  -- With no opted-in users / eligible unseen news, no Edge invocation is made.
  if not exists(select 1 from push_private.subscriptions s where s.last_active_at < now() - interval '10 minutes'
    and (s.last_attempt_at is null or s.last_attempt_at <= now() - interval '24 hours')
    and push_private.has_news(s.user_id, greatest(s.enabled_at, coalesce(s.last_delivered_at, s.enabled_at)))) then return; end if;
  perform net.http_post(
    url := 'https://nsnvryyocwzfwxiwhqca.supabase.co/functions/v1/push-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'pivnik_push_dispatch_token')),
    body := '{"action":"dispatch"}'::jsonb, timeout_milliseconds := 120000);
end;
$$;
revoke all on function push_private.dispatch() from public, anon, authenticated, service_role;
select cron.schedule('pivnik-push-news', '*/5 * * * *', 'select push_private.dispatch();');
