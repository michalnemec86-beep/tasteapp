-- Run as the project database administrator. Every fixture/cursor change rolls
-- back; no beer, brewery, tasting or achievement records are created/changed.
begin;
do $$
declare
  v_users uuid[];
  v_breweries bigint[];
  v_beer bigint;
  v_producer bigint;
  v_start timestamptz := clock_timestamp();
  v_before jsonb;
  v_result jsonb;
  v_reads public.navigation_reads%rowtype;
  v_affected int;
  v_denied boolean;
begin
  select array_agg(id) into v_users from (select id from public.profiles order by id limit 2) x;
  select array_agg(id) into v_breweries from (select id from public.breweries order by id limit 2) x;
  select id, brewery_id into v_beer, v_producer from public.beers where brewery_id is not null order by id limit 1;
  assert array_length(v_users,1) = 2 and array_length(v_breweries,1) = 2 and v_beer is not null, 'Requires two existing accounts and catalogue fixtures';
  update public.navigation_reads set activity_seen_at=v_start-interval '30 seconds',
    beers_seen_at=v_start-interval '30 seconds', breweries_seen_at=v_start-interval '30 seconds'
    where user_id in (v_users[1],v_users[2]);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_users[1],'role','authenticated')::text, true);
  execute 'set local role authenticated';
  v_before := public.navigation_news();
  assert (select count(*) from public.navigation_reads) = 1, 'RLS reveals only this account';
  execute 'reset role';

  -- Maintenance events normally stay silent; set an authenticated fixture
  -- actor explicitly so the existing origin trigger permits these test rows.
  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_users[2],'role','authenticated')::text, true);
  insert into public.catalog_events(actor_user_id,event_type,brewery_id,beer_id,show_in_timeline,created_at) values
    (v_users[2],'brewery_created',v_breweries[1],null,true,v_start-interval '20 seconds'),
    (v_users[2],'brewery_created',v_breweries[1],null,true,v_start-interval '20 seconds'),
    (v_users[2],'brewery_created',v_breweries[2],null,true,v_start-interval '10 seconds'),
    (v_users[1],'brewery_created',v_breweries[1],null,true,v_start-interval '10 seconds'),
    (v_users[2],'brewery_created',v_breweries[1],null,false,v_start-interval '10 seconds'),
    (v_users[2],'beer_created',v_producer,v_beer,true,v_start-interval '20 seconds'),
    (v_users[2],'beer_created',v_producer,v_beer,true,v_start-interval '20 seconds'),
    (v_users[2],'beer_created',v_producer,v_beer,false,v_start-interval '10 seconds'),
    (v_users[2],'beer_version_created',v_producer,v_beer,true,v_start-interval '20 seconds'),
    (v_users[2],'beer_confirmed',v_producer,v_beer,true,v_start-interval '20 seconds');

  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_users[1],'role','authenticated')::text, true);
  execute 'set local role authenticated';
  v_result := public.navigation_news();
  assert (v_result->>'brewery_count')::int = (v_before->>'brewery_count')::int + 2, 'Distinct breweries, excluding own and hidden';
  assert (v_result->>'beer_count')::int = (v_before->>'beer_count')::int + 1, 'Only distinct beer creations';
  assert (v_result->>'activity_count')::int = (v_before->>'activity_count')::int + 6, 'Timeline visible events, excluding confirmations';
  v_result := public.navigation_news('breweries',v_start-interval '15 seconds');
  assert (v_result->>'brewery_count')::int >= 1, 'Later events survive a delayed acknowledgement';
  assert (v_result->>'beer_count')::int = (v_before->>'beer_count')::int + 1, 'Other section stays unread';
  perform public.navigation_news('breweries',v_start-interval '25 seconds');
  select * into v_reads from public.navigation_reads;
  assert v_reads.breweries_seen_at = v_start-interval '15 seconds', 'Cursor cannot regress';
  perform public.navigation_news('beers',v_start+interval '1 day');
  select * into v_reads from public.navigation_reads;
  assert v_reads.beers_seen_at <= clock_timestamp(), 'Cursor cannot move into future';

  update public.navigation_reads set beers_seen_at=v_start where user_id=v_users[2];
  get diagnostics v_affected = row_count;
  assert v_affected=0, 'Cannot update another account';
  v_denied := false;
  begin
    insert into public.navigation_reads(user_id) values(v_users[2]);
  exception when insufficient_privilege then v_denied := true;
  end;
  assert v_denied, 'Cannot insert another account';
  v_denied := false;
  begin
    update public.navigation_reads set user_id=v_users[2];
  exception when insufficient_privilege then v_denied := true;
  end;
  assert v_denied, 'Cannot reassign ownership';

  execute 'set local role anon';
  v_denied := false;
  begin
    perform public.navigation_news();
  exception when insufficient_privilege then v_denied := true;
  end;
  assert v_denied, 'Anonymous RPC execution denied';
  execute 'reset role';
  delete from public.navigation_reads where user_id=v_users[1];
  execute 'set local role authenticated';
  v_result := public.navigation_news();
  assert (select count(*) from public.navigation_reads)=1, 'New account cursor initializes under RLS';
  assert (v_result->>'activity_count')::int=0 and (v_result->>'beer_count')::int=0 and (v_result->>'brewery_count')::int=0, 'New initialization does not surface old content';
  execute 'reset role';
end;
$$;
rollback;
select 'navigation news SQL assertions passed; all fixtures rolled back' as result;
