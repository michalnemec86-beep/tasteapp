CREATE OR REPLACE FUNCTION public.get_profile_tasting_history_page(target_user_id uuid, p_sort text DEFAULT 'newest'::text, p_country text DEFAULT NULL::text, p_query text DEFAULT NULL::text, p_letter text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  with base as (
    select
      t.id,
      coalesce(t.tasted_on, t.tasted_at::date) as tasting_date,
      t.place,
      t.notes,
      b.name as beer_name,
      brand.name as brand_name,
      brewery.name as brewery_name,
      brewery.country as brewery_country,
      current_style.name as current_style_name,
      case
        when upper(left(extensions.unaccent(btrim(coalesce(b.name, ''))), 1)) ~ '^[A-Z]$'
          then upper(left(extensions.unaccent(btrim(b.name)), 1))
        else '#'
      end as beer_letter
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    left join public.brands brand
      on brand.id = b.brand_id
    left join public.beer_versions version
      on version.id = t.beer_version_id
    left join public.breweries brewery
      on brewery.id = coalesce(
        version.brewery_id,
        b.brewery_id
      )
    left join public.beer_styles current_style
      on current_style.id = b.style_id
    where t.user_id = target_user_id
  ),
  filtered as (
    select *
    from base
    where (
      p_country is null
      or btrim(p_country) = ''
      or brewery_country = p_country
    )
    and (
      p_letter is null
      or btrim(p_letter) = ''
      or beer_letter = upper(btrim(p_letter))
    )
    and (
      p_query is null
      or btrim(p_query) = ''
      or lower(coalesce(beer_name, '')) like '%' || lower(btrim(p_query)) || '%'
      or lower(coalesce(brand_name, '')) like '%' || lower(btrim(p_query)) || '%'
      or lower(coalesce(brewery_name, '')) like '%' || lower(btrim(p_query)) || '%'
      or lower(coalesce(brewery_country, '')) like '%' || lower(btrim(p_query)) || '%'
      or lower(coalesce(current_style_name, '')) like '%' || lower(btrim(p_query)) || '%'
      or lower(coalesce(place, '')) like '%' || lower(btrim(p_query)) || '%'
      or lower(coalesce(notes, '')) like '%' || lower(btrim(p_query)) || '%'
    )
  ),
  ordered as (
    select
      filtered.*,
      row_number() over (
        order by
          case
            when p_sort = 'alpha'
              then lower(extensions.unaccent(coalesce(beer_name, '')))
          end asc,
          case
            when p_sort = 'oldest'
              then tasting_date
          end asc,
          case
            when p_sort = 'country'
              then lower(extensions.unaccent(coalesce(brewery_country, '')))
          end asc,
          case
            when p_sort = 'country'
              then lower(extensions.unaccent(coalesce(beer_name, '')))
          end asc,
          case
            when p_sort not in ('alpha', 'oldest', 'country')
              then tasting_date
          end desc,
          id asc
      ) as row_number
    from filtered
  ),
  counts as (
    select
      (select count(*)::integer from base) as all_total,
      (select count(*)::integer from filtered) as filtered_total
  ),
  paging as (
    select
      all_total,
      filtered_total,
      greatest(
        1,
        ceiling(
          filtered_total::numeric /
          greatest(1, p_page_size)
        )::integer
      ) as page_count,
      least(
        greatest(1, p_page),
        greatest(
          1,
          ceiling(
            filtered_total::numeric /
            greatest(1, p_page_size)
          )::integer
        )
      ) as current_page
    from counts
  ),
  page_rows as (
    select ordered.*
    from ordered
    cross join paging
    where ordered.row_number >
      (paging.current_page - 1) * greatest(1, p_page_size)
      and ordered.row_number <=
      paging.current_page * greatest(1, p_page_size)
  )
  select jsonb_build_object(
    'allTotal',
    paging.all_total,
    'filteredTotal',
    paging.filtered_total,
    'pageCount',
    paging.page_count,
    'currentPage',
    paging.current_page,
    'ids',
    coalesce(
      (
        select jsonb_agg(
          id
          order by row_number
        )
        from page_rows
      ),
      '[]'::jsonb
    ),
    'countries',
    coalesce(
      (
        select jsonb_agg(
          country
          order by country
        )
        from (
          select distinct brewery_country as country
          from base
          where nullif(
            btrim(
              coalesce(
                brewery_country,
                ''
              )
            ),
            ''
          ) is not null
        ) countries
      ),
      '[]'::jsonb
    ),
    'letters',
    coalesce(
      (
        select jsonb_agg(
          letter
          order by
            case
              when letter = '#'
                then 1
              else 0
            end,
            letter
        )
        from (
          select distinct beer_letter as letter
          from base
        ) letters
      ),
      '[]'::jsonb
    )
  )
  from paging;
$function$


revoke all on function public.get_profile_tasting_history_page(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.get_profile_tasting_history_page(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
) to authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_brewery_list(target_user_id uuid)
 RETURNS TABLE(id bigint, name text, tasting_count bigint, country text, logo_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    brewery.id::bigint as id,
    brewery.name::text as name,
    sum(
      coalesce(
        tasting.quantity,
        1
      )
    )::bigint as tasting_count,
    brewery.country::text as country,
    brewery.logo_url::text as logo_url
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
  where tasting.user_id = target_user_id
  group by
    brewery.id,
    brewery.name,
    brewery.country,
    brewery.logo_url;
$function$


revoke all on function public.get_profile_brewery_list(uuid)
  from public;

grant execute on function public.get_profile_brewery_list(uuid)
  to authenticated;

CREATE OR REPLACE FUNCTION public.get_achievement_metrics(target_user_id uuid)
 RETURNS TABLE(current_tastings bigint, current_beers bigint, current_breweries bigint, current_styles bigint, current_countries bigint, current_hops bigint, historical_tastings bigint, historical_beers bigint, historical_breweries bigint, historical_styles bigint, historical_countries bigint, historical_hops bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  with base as (
    select
      t.id,
      t.show_in_timeline,
      t.beer_id,
      t.beer_version_id,
      t.tasted_on,
      b.brewery_id,
      b.style_id as beer_style_id,
      version.style_id as version_style_id,
      brewery.country
    from public.tastings t
    left join public.beers b
      on b.id = t.beer_id
    left join public.beer_versions version
      on version.id = t.beer_version_id
    left join public.breweries brewery
      on brewery.id = b.brewery_id
    where t.user_id = target_user_id
      and t.tasted_on >= date '2026-09-01'
  ),
  core as (
    select
      count(*)::bigint as current_tastings,
      count(distinct beer_id)::bigint as current_beers,
      count(distinct brewery_id)::bigint as current_breweries,
      count(
        distinct coalesce(
          version_style_id,
          beer_style_id
        )
      )::bigint as current_styles,
      count(
        distinct nullif(
          lower(
            extensions.unaccent(
              btrim(
                coalesce(
                  country,
                  ''
                )
              )
            )
          ),
          ''
        )
      )::bigint as current_countries,
      count(*) filter (
        where show_in_timeline is not true
      )::bigint as historical_tastings,
      count(distinct beer_id) filter (
        where show_in_timeline is not true
      )::bigint as historical_beers,
      count(distinct brewery_id) filter (
        where show_in_timeline is not true
      )::bigint as historical_breweries,
      count(
        distinct coalesce(
          version_style_id,
          beer_style_id
        )
      ) filter (
        where show_in_timeline is not true
      )::bigint as historical_styles,
      count(
        distinct nullif(
          lower(
            extensions.unaccent(
              btrim(
                coalesce(
                  country,
                  ''
                )
              )
            )
          ),
          ''
        )
      ) filter (
        where show_in_timeline is not true
      )::bigint as historical_countries
    from base
  ),
  hop_rows as (
    select
      base.show_in_timeline,
      version_hop.hop_id
    from base
    join public.beer_version_hops version_hop
      on base.beer_version_id is not null
      and version_hop.beer_version_id =
        base.beer_version_id

    union all

    select
      base.show_in_timeline,
      beer_hop.hop_id
    from base
    join public.beer_hops beer_hop
      on base.beer_version_id is null
      and beer_hop.beer_id =
        base.beer_id
  ),
  hop_metrics as (
    select
      count(
        distinct hop_id
      )::bigint as current_hops,
      count(
        distinct hop_id
      ) filter (
        where show_in_timeline is not true
      )::bigint as historical_hops
    from hop_rows
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
$function$


revoke all on function public.get_achievement_metrics(uuid)
  from public;

grant execute on function public.get_achievement_metrics(uuid)
  to authenticated;
