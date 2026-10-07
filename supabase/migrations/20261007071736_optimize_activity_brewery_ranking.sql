CREATE OR REPLACE FUNCTION public.get_activity_brewery_tasting_ranking()
 RETURNS TABLE(id bigint, name text, tasting_count bigint, logo_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    brewery.id::bigint as id,
    brewery.name::text as name,
    count(*)::bigint as tasting_count,
    max(brewery.logo_url)::text as logo_url
  from public.tastings tasting
  join public.beers beer
    on beer.id = tasting.beer_id
  left join public.beer_versions version
    on version.id = tasting.beer_version_id
  join public.breweries brewery
    on brewery.id = coalesce(
      version.brewery_id,
      beer.brewery_id
    )
  group by
    brewery.id,
    brewery.name;
$function$


revoke all on function public.get_activity_brewery_tasting_ranking()
  from public;

grant execute on function public.get_activity_brewery_tasting_ranking()
  to authenticated;
