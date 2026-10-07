CREATE OR REPLACE FUNCTION public.get_country_catalog_metrics(p_country text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  with country_breweries as (
    select
      br.id,
      br.closed_year
    from public.breweries br
    where lower(extensions.unaccent(btrim(coalesce(br.country, ''))))
      = lower(extensions.unaccent(btrim(p_country)))
  )
  select jsonb_build_object(
    'breweries',
    (select count(*)::bigint from country_breweries),
    'activeBreweries',
    (
      select count(*)::bigint
      from country_breweries
      where closed_year is null
    ),
    'brands',
    (
      select count(distinct b.brand_id)::bigint
      from public.beers b
      join country_breweries br
        on br.id = b.brewery_id
      where b.brand_id is not null
    )
  );
$function$


revoke all on function public.get_country_catalog_metrics(text)
  from public;

grant execute on function public.get_country_catalog_metrics(text)
  to authenticated;
