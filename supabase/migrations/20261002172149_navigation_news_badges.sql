-- One small preference row per account; no per-event notification fan-out.
create table public.navigation_reads (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  activity_seen_at timestamptz not null default now(),
  beers_seen_at timestamptz not null default now(),
  breweries_seen_at timestamptz not null default now()
);

alter table public.navigation_reads enable row level security;
revoke all on public.navigation_reads from public, anon, authenticated;
grant select on public.navigation_reads to authenticated;
grant insert (user_id) on public.navigation_reads to authenticated;
grant update (activity_seen_at, beers_seen_at, breweries_seen_at)
  on public.navigation_reads to authenticated;

create policy "Read own navigation visits" on public.navigation_reads
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Initialize own navigation visits" on public.navigation_reads
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Acknowledge own navigation news" on public.navigation_reads
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Existing content does not become unread when the feature is enabled.
insert into public.navigation_reads (user_id) select id from public.profiles;

create index tastings_navigation_news_idx on public.tastings (created_at)
  where show_in_timeline = true;

create function public.navigation_news(
  p_seen_section text default null,
  p_seen_through timestamptz default null,
  p_include_achievements boolean default true
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot_at timestamptz := clock_timestamp();
  v_seen_through timestamptz;
  v_reads public.navigation_reads%rowtype;
  v_cutoff timestamptz := v_snapshot_at - interval '3 months';
  v_catalog_activity bigint;
  v_tastings bigint;
  v_achievements bigint := 0;
  v_beers bigint;
  v_breweries bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_seen_section is not null and p_seen_section not in ('activity', 'beers', 'breweries') then
    raise exception 'Invalid navigation section' using errcode = '22023';
  end if;

  select * into v_reads from public.navigation_reads where user_id = v_user_id;
  if not found then
    insert into public.navigation_reads (user_id) values (v_user_id)
      on conflict (user_id) do nothing;
    select * into v_reads from public.navigation_reads where user_id = v_user_id;
  end if;

  -- A delayed response/device must never move a cursor backwards or swallow
  -- events created after the snapshot the user actually opened.
  if p_seen_section is not null then
    v_seen_through := least(coalesce(p_seen_through, v_snapshot_at), v_snapshot_at);
    update public.navigation_reads set
      activity_seen_at = case when p_seen_section = 'activity' then greatest(activity_seen_at, v_seen_through) else activity_seen_at end,
      beers_seen_at = case when p_seen_section = 'beers' then greatest(beers_seen_at, v_seen_through) else beers_seen_at end,
      breweries_seen_at = case when p_seen_section = 'breweries' then greatest(breweries_seen_at, v_seen_through) else breweries_seen_at end
    where user_id = v_user_id returning * into v_reads;
  end if;

  select count(*) into v_catalog_activity from public.catalog_events
    where show_in_timeline = true and actor_user_id <> v_user_id
      and event_type <> 'beer_confirmed'
      and created_at > greatest(v_reads.activity_seen_at, v_cutoff)
      and created_at <= v_snapshot_at;
  select count(*) into v_tastings from public.tastings
    where show_in_timeline = true and user_id <> v_user_id
      and tasted_on >= (v_cutoff at time zone 'UTC')::date
      and created_at > v_reads.activity_seen_at and created_at <= v_snapshot_at;
  if p_include_achievements then
    select count(*) into v_achievements from public.user_achievements
      where show_in_timeline = true and user_id <> v_user_id
        and unlocked_at > greatest(v_reads.activity_seen_at, v_cutoff)
        and unlocked_at <= v_snapshot_at;
  end if;
  select count(distinct beer_id) into v_beers from public.catalog_events
    where show_in_timeline = true and actor_user_id <> v_user_id
      and event_type = 'beer_created' and beer_id is not null
      and created_at > v_reads.beers_seen_at and created_at <= v_snapshot_at;
  select count(distinct brewery_id) into v_breweries from public.catalog_events
    where show_in_timeline = true and actor_user_id <> v_user_id
      and event_type = 'brewery_created' and brewery_id is not null
      and created_at > v_reads.breweries_seen_at and created_at <= v_snapshot_at;

  return jsonb_build_object(
    'snapshot_at', v_snapshot_at,
    'activity_count', v_catalog_activity + v_tastings + v_achievements,
    'beer_count', v_beers, 'brewery_count', v_breweries,
    'beers_since', v_reads.beers_seen_at,
    'breweries_since', v_reads.breweries_seen_at
  );
end;
$$;

revoke all on function public.navigation_news(text, timestamptz, boolean) from public, anon;
grant execute on function public.navigation_news(text, timestamptz, boolean) to authenticated;
