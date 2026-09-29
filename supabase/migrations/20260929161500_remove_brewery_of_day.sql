-- Remove the retired "Pivovar dne" feature and its achievement series.
-- Existing beer, tasting and brewery data are untouched.

delete from public.user_achievements
where achievement_key like 'brewery_of_day_%';

drop function if exists public.get_achievement_metrics(uuid);

create function public.get_achievement_metrics(target_user_id uuid)
returns table(
  current_tastings bigint,
  current_beers bigint,
  current_breweries bigint,
  current_styles bigint,
  current_countries bigint,
  current_hops bigint,
  historical_tastings bigint,
  historical_beers bigint,
  historical_breweries bigint,
  historical_styles bigint,
  historical_countries bigint,
  historical_hops bigint
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $function$
  with base as (
    select
      t.id,
      t.show_in_timeline,
      t.beer_id,
      t.beer_version_id,
      t.tasted_on,
      b.brewery_id,
      coalesce(bv.style_id, b.style_id) as style_id,
      br.country
    from public.tastings t
    left join public.beers b on b.id = t.beer_id
    left join public.beer_versions bv on bv.id = t.beer_version_id
    left join public.breweries br on br.id = b.brewery_id
    where t.user_id = target_user_id
      and t.tasted_on >= date '2026-09-01'
  ),
  core as (
    select
      count(*)::bigint as current_tastings,
      count(distinct beer_id)::bigint as current_beers,
      count(distinct brewery_id)::bigint as current_breweries,
      count(distinct style_id)::bigint as current_styles,
      count(distinct nullif(btrim(country), ''))::bigint as current_countries,
      count(*) filter (where show_in_timeline is not true)::bigint as historical_tastings,
      count(distinct beer_id) filter (where show_in_timeline is not true)::bigint as historical_beers,
      count(distinct brewery_id) filter (where show_in_timeline is not true)::bigint as historical_breweries,
      count(distinct style_id) filter (where show_in_timeline is not true)::bigint as historical_styles,
      count(distinct nullif(btrim(country), '')) filter (where show_in_timeline is not true)::bigint as historical_countries
    from base
  ),
  hop_metrics as (
    select
      count(distinct bvh.hop_id)::bigint as current_hops,
      count(distinct bvh.hop_id) filter (where base.show_in_timeline is not true)::bigint as historical_hops
    from base
    left join public.beer_version_hops bvh
      on bvh.beer_version_id = base.beer_version_id
  )
  select
    core.current_tastings,
    core.current_beers,
    core.current_breweries,
    core.current_styles,
    core.current_countries,
    hop_metrics.current_hops,
    core.historical_tastings,
    core.historical_beers,
    core.historical_breweries,
    core.historical_styles,
    core.historical_countries,
    hop_metrics.historical_hops
  from core
  cross join hop_metrics;
$function$;

drop table if exists public.brewery_of_day;
