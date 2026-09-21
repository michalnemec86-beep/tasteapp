-- Catalog confirmation is an internal administrative state and should not
-- create a public timeline event.

create or replace function public.confirm_catalog_beer(p_beer_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_admin_id constant uuid := '17be5dc3-a3f9-4fd2-ae90-dee7692034fc';
  v_beer public.beers%rowtype;
  v_current public.beer_versions%rowtype;
begin
  if v_user_id is null or v_user_id <> v_admin_id then
    raise exception 'Katalogové pivo může potvrdit pouze správce katalogu.';
  end if;

  select * into v_beer
  from public.beers
  where id = p_beer_id
  for update;

  if not found then
    raise exception 'Pivo nebylo nalezeno.';
  end if;

  if v_beer.brand_id is null or nullif(trim(v_beer.name), '') is null then
    raise exception 'Pivo musí mít pivovar, značku a název.';
  end if;

  select * into v_current
  from public.beer_versions
  where beer_id = p_beer_id
    and is_current;

  if not found
     or v_current.style_id is null
     or (v_current.plato is null and v_current.abv is null) then
    raise exception 'Před potvrzením doplň styl a alespoň stupňovitost nebo obsah alkoholu.';
  end if;

  if v_beer.is_catalog then
    return false;
  end if;

  update public.beers
  set is_catalog = true,
      catalog_confirmed_at = now(),
      catalog_confirmed_by = v_user_id
  where id = p_beer_id;

  return true;
end;
$function$;
