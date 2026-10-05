-- Entire verification rolls back; does not subscribe real devices or call a provider.
begin;
do $$
declare
  u uuid; other_u uuid; b bigint; br bigint;
  sid uuid; tok uuid := gen_random_uuid(); claimed jsonb; attempt timestamptz;
  baseline timestamptz := now() - interval '1 microsecond';
  row_ids bigint[] := array[]::bigint[]; event_id bigint;
begin
  select id into u from public.profiles order by id limit 1;
  select id into other_u from public.profiles where id <> u order by id limit 1;
  select id,brewery_id into b,br from public.beers where brewery_id is not null order by id limit 1;
  assert u is not null and other_u is not null and b is not null and br is not null;

  -- Deny direct access AND every service RPC for signed-in/anonymous clients.
  assert not has_schema_privilege('authenticated','push_private','usage');
  assert not has_schema_privilege('anon','push_private','usage');
  assert not has_function_privilege('authenticated','public.push_news_configuration()','execute');
  assert not has_function_privilege('anon','public.push_news_configuration()','execute');
  assert not has_function_privilege('authenticated','public.register_push_news(uuid,text,text,text,uuid)','execute');
  assert not has_function_privilege('authenticated','public.claim_push_news()','execute');
  assert not has_function_privilege('authenticated','public.finish_push_news(uuid,uuid,timestamp with time zone,boolean)','execute');
  assert has_function_privilege('service_role','public.push_news_configuration()','execute');

  perform push_private.register(u,'https://web.push.apple.com/rollback-fixture',repeat('B',87),repeat('a',22),tok);
  select id into sid from push_private.subscriptions where endpoint = 'https://web.push.apple.com/rollback-fixture';
  assert push_private.status(u,'https://web.push.apple.com/rollback-fixture');
  assert not push_private.status(other_u,'https://web.push.apple.com/rollback-fixture');
  update push_private.subscriptions set enabled_at = baseline, last_active_at = now() - interval '11 minutes' where id = sid;
  update public.navigation_reads set activity_seen_at = baseline, beers_seen_at = baseline, breweries_seen_at = baseline where user_id = u;
  assert not push_private.has_news(u,now()), 'old content is not news after activation';
  -- Preserve the origin guard: test catalogue rows require a signed-in context.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_u,'role','authenticated')::text,true);

  insert into public.catalog_events(actor_user_id,beer_id,brewery_id,event_type,show_in_timeline,created_at)
    values(u,b,br,'beer_created',true,now()) returning id into event_id;
  row_ids := array_append(row_ids,event_id);

  insert into public.catalog_events(actor_user_id,beer_id,brewery_id,event_type,show_in_timeline,created_at)
    values(other_u,b,br,'beer_created',false,now()) returning id into event_id;
  row_ids := array_append(row_ids,event_id);

  insert into public.catalog_events(actor_user_id,beer_id,brewery_id,event_type,show_in_timeline,created_at)
    values(other_u,b,br,'beer_confirmed',true,now()) returning id into event_id;
  row_ids := array_append(row_ids,event_id);

  perform set_config('pivnik.test_user',u::text,true);
  perform set_config('pivnik.test_other',other_u::text,true);
  perform set_config('pivnik.test_brewery',br::text,true);
  perform set_config('pivnik.test_sub',sid::text,true);
  perform set_config('pivnik.test_token',tok::text,true);
end;
$$;
-- Separate fixture setup from the eligibility checks.
do $$
declare
  u uuid := current_setting('pivnik.test_user')::uuid;
  other_u uuid := current_setting('pivnik.test_other')::uuid;
  br bigint := current_setting('pivnik.test_brewery')::bigint;
  baseline timestamptz := now() - interval '1 microsecond';
begin
  assert not push_private.has_news(u,baseline), 'own, hidden and confirmation events must not notify';
  insert into public.catalog_events(actor_user_id,brewery_id,event_type,show_in_timeline,created_at)
    values(other_u,br,'brewery_created',true,now());
end;
$$;
do $$
declare
  u uuid := current_setting('pivnik.test_user')::uuid;
  other_u uuid := current_setting('pivnik.test_other')::uuid;
  sid uuid := current_setting('pivnik.test_sub')::uuid;
  tok uuid := current_setting('pivnik.test_token')::uuid;
  baseline timestamptz := now() - interval '1 microsecond';
  claimed jsonb; attempt timestamptz;
begin
  assert push_private.has_news(u,baseline), 'visible new brewery is eligible';

  update push_private.subscriptions set last_active_at = now() where id = sid;
  claimed := push_private.claim();
  assert not exists(select 1 from jsonb_array_elements(claimed) e where e->>'id' = sid::text), 'active app does not get a retention message';
  update push_private.subscriptions set last_active_at = now() - interval '11 minutes' where id = sid;
  claimed := push_private.claim();
  assert exists(select 1 from jsonb_array_elements(claimed) e where e->>'id' = sid::text), 'background device is claimed';
  select last_attempt_at into attempt from push_private.subscriptions where id = sid;
  assert not exists(select 1 from jsonb_array_elements(push_private.claim()) e where e->>'id' = sid::text), 'second job cannot send twice per day';

  perform push_private.register(u,'https://web.push.apple.com/rollback-second',repeat('B',87),repeat('a',22),gen_random_uuid());
  update push_private.subscriptions set enabled_at = baseline,last_active_at = now() - interval '11 minutes' where user_id = u;
  assert not exists(select 1 from jsonb_array_elements(push_private.claim()) e where e->>'id' = sid::text), 'daily limit is shared between devices';
  perform push_private.finish(sid,gen_random_uuid(),attempt,false);
  assert (select last_delivered_at is null from push_private.subscriptions where id = sid), 'stale device token cannot acknowledge a replacement';
  perform push_private.finish(sid,tok,attempt,false);
  assert not push_private.has_news(u,attempt), 'same news is not sent again tomorrow';
  assert (select last_delivered_at = attempt from push_private.subscriptions where id = sid);

  -- Owner isolation, read-cursor suppression and safe rebinding on a shared phone.
  perform push_private.manage(other_u,'https://web.push.apple.com/rollback-fixture',true);
  assert push_private.status(u,'https://web.push.apple.com/rollback-fixture');
  update public.navigation_reads set activity_seen_at = now(), beers_seen_at = now(), breweries_seen_at = now() where user_id = u;

  perform push_private.register(other_u,'https://web.push.apple.com/rollback-fixture',repeat('B',87),repeat('a',22),gen_random_uuid());
  assert not push_private.status(u,'https://web.push.apple.com/rollback-fixture');
  assert push_private.status(other_u,'https://web.push.apple.com/rollback-fixture');
  perform push_private.finish(sid,tok,attempt,true);
  assert push_private.status(other_u,'https://web.push.apple.com/rollback-fixture'), 'old failed send cannot delete a replacement subscription';
  perform push_private.manage(other_u,'https://web.push.apple.com/rollback-fixture',true);
  assert not push_private.status(other_u,'https://web.push.apple.com/rollback-fixture');
end;
$$;
do $$ begin
  assert not push_private.has_news(current_setting('pivnik.test_user')::uuid,now() - interval '1 microsecond'), 'already read sections do not notify';
end; $$;
rollback;
select 'push SQL assertions passed; fixtures rolled back' as result;
