-- Keep catalog validation consistent across UI, direct guarded updates,
-- catalog confirmation and the versioning RPC.
-- A style is required and at least one strength value (Plato or ABV) is enough.

create or replace function private.guard_catalog_beer_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_admin_id constant uuid := '17be5dc3-a3f9-4fd2-ae90-dee7692034fc';
begin
  if current_setting('beerapp.version_rpc', true) = 'on' or v_user_id = v_admin_id then
    return new;
  end if;

  if old.brewery_id is distinct from new.brewery_id
     or old.brand_id is distinct from new.brand_id
     or old.name is distinct from new.name then
    raise exception 'Pivovar, značka a název tvoří pevnou identitu piva.';
  end if;

  if v_user_id is null or not exists (
    select 1 from public.tastings
    where beer_id = old.id
      and user_id = v_user_id
      and tasted_on >= date '2026-09-01'
  ) then
    raise exception 'Upravit lze jen vlastní pivo ochutnané od 1. 9. 2026.';
  end if;

  if new.style_id is null or (new.plato is null and new.abv is null) then
    raise exception 'Pro novou verzi je povinný styl a alespoň stupňovitost nebo obsah alkoholu.';
  end if;

  return new;
end;
$function$;

create or replace function public.update_catalog_beer_version(
  p_beer_id bigint,
  p_style_id bigint,
  p_plato numeric,
  p_abv numeric,
  p_ibu numeric default null,
  p_ebc numeric default null,
  p_notes text default null,
  p_photo_url text default null,
  p_is_non_alcoholic boolean default false,
  p_hop_ids bigint[] default '{}'::bigint[],
  p_collaborator_ids bigint[] default '{}'::bigint[]
)
returns table(version_id bigint, changed boolean)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_admin_id constant uuid := '17be5dc3-a3f9-4fd2-ae90-dee7692034fc';
  v_beer public.beers%rowtype;
  v_current public.beer_versions%rowtype;
  v_new_version_id bigint;
  v_current_hops bigint[];
  v_current_collaborators bigint[];
  v_hops bigint[] := coalesce((select array_agg(distinct x order by x) from unnest(coalesce(p_hop_ids, '{}'::bigint[])) x), '{}'::bigint[]);
  v_collaborators bigint[] := coalesce((select array_agg(distinct x order by x) from unnest(coalesce(p_collaborator_ids, '{}'::bigint[])) x), '{}'::bigint[]);
begin
  if v_user_id is null then
    raise exception 'Uživatel není přihlášen.';
  end if;

  select * into v_beer from public.beers where id = p_beer_id for update;
  if not found then raise exception 'Pivo nebylo nalezeno.'; end if;

  if v_user_id <> v_admin_id and not exists (
    select 1 from public.tastings
    where beer_id = p_beer_id
      and user_id = v_user_id
      and tasted_on >= date '2026-09-01'
  ) then
    raise exception 'Upravit lze jen vlastní pivo ochutnané od 1. 9. 2026.';
  end if;

  if p_style_id is null or (p_plato is null and p_abv is null) then
    raise exception 'Pro novou verzi je povinný styl a alespoň stupňovitost nebo obsah alkoholu.';
  end if;

  select * into v_current
  from public.beer_versions
  where beer_id = p_beer_id and is_current
  for update;

  if not found then raise exception 'Pivo nemá aktuální katalogovou verzi.'; end if;

  select coalesce(array_agg(hop_id order by hop_id), '{}'::bigint[])
    into v_current_hops
  from public.beer_version_hops where beer_version_id = v_current.id;

  select coalesce(array_agg(brewery_id order by brewery_id), '{}'::bigint[])
    into v_current_collaborators
  from public.beer_version_collaborators where beer_version_id = v_current.id;

  if v_current.style_id is not distinct from p_style_id
     and v_current.plato is not distinct from p_plato
     and v_current.abv is not distinct from p_abv
     and v_current.ibu is not distinct from p_ibu
     and v_current.ebc is not distinct from p_ebc
     and v_current.notes is not distinct from nullif(trim(p_notes), '')
     and v_current.photo_url is not distinct from nullif(trim(p_photo_url), '')
     and v_current.is_non_alcoholic is not distinct from coalesce(p_is_non_alcoholic, false)
     and v_current_hops = v_hops
     and v_current_collaborators = v_collaborators then
    return query select v_current.id, false;
    return;
  end if;

  perform set_config('beerapp.version_rpc', 'on', true);

  update public.beer_versions
  set is_current = false,
      valid_to = current_date,
      version_year = coalesce(version_year, extract(year from current_date)::smallint)
  where id = v_current.id;

  insert into public.beer_versions (
    beer_id, brewery_id, version_year, valid_from, plato, abv, ibu, ebc,
    style_id, is_current, notes, photo_url, is_non_alcoholic, created_by,
    supersedes_version_id
  ) values (
    v_beer.id, v_beer.brewery_id, extract(year from current_date)::smallint,
    current_date, p_plato, p_abv, p_ibu, p_ebc, p_style_id, true,
    nullif(trim(p_notes), ''), nullif(trim(p_photo_url), ''),
    coalesce(p_is_non_alcoholic, false), v_user_id, v_current.id
  ) returning id into v_new_version_id;

  insert into public.beer_version_hops (beer_version_id, hop_id)
  select v_new_version_id, x from unnest(v_hops) x;

  insert into public.beer_version_collaborators (beer_version_id, brewery_id, display_order)
  select v_new_version_id, x, ordinality::integer
  from unnest(v_collaborators) with ordinality as t(x, ordinality);

  update public.beers
  set style_id = p_style_id,
      plato = p_plato,
      abv = p_abv,
      ibu = p_ibu,
      ebc = p_ebc,
      notes = nullif(trim(p_notes), ''),
      photo_url = nullif(trim(p_photo_url), ''),
      is_non_alcoholic = coalesce(p_is_non_alcoholic, false)
  where id = v_beer.id;

  delete from public.beer_hops where beer_id = v_beer.id;
  insert into public.beer_hops (beer_id, hop_id)
  select v_beer.id, x from unnest(v_hops) x;

  insert into public.catalog_events (actor_user_id, beer_id, brewery_id, event_type)
  values (v_user_id, v_beer.id, v_beer.brewery_id, 'beer_version_created');

  return query select v_new_version_id, true;
end;
$function$;

revoke all on function private.guard_catalog_beer_update() from public, anon, authenticated;
revoke all on function public.update_catalog_beer_version(
  bigint, bigint, numeric, numeric, numeric, numeric, text, text, boolean, bigint[], bigint[]
) from public, anon;
grant execute on function public.update_catalog_beer_version(
  bigint, bigint, numeric, numeric, numeric, numeric, text, text, boolean, bigint[], bigint[]
) to authenticated;
