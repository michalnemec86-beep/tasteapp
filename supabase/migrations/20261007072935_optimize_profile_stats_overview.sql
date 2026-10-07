CREATE OR REPLACE FUNCTION public.get_profile_stats_overview(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  with base as (
    select
      t.id,
      coalesce(t.quantity, 1)::numeric as quantity,
      coalesce(t.tasted_on, t.tasted_at::date) as tasting_date,
      t.plato::numeric as plato,
      t.abv::numeric as abv,
      t.ibu::numeric as ibu,
      b.id as beer_id,
      b.name as beer_name,
      b.is_non_alcoholic
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    where t.user_id = target_user_id
  ),
  date_bounds as (
    select
      min(tasting_date) as first_date,
      max(tasting_date) as last_date
    from base
    where tasting_date is not null
  ),
  month_raw as (
    select
      date_trunc('month', tasting_date)::date as month_start,
      sum(quantity)::bigint as count
    from base
    where tasting_date is not null
    group by 1
  ),
  month_series as (
    select
      generated.month_start::date as month_start
    from date_bounds bounds
    cross join lateral generate_series(
      date_trunc('month', bounds.first_date)::date,
      date_trunc('month', bounds.last_date)::date,
      interval '1 month'
    ) as generated(month_start)
    where bounds.first_date is not null
      and bounds.last_date is not null
  ),
  monthly as (
    select
      series.month_start,
      coalesce(raw.count, 0)::bigint as count
    from month_series series
    left join month_raw raw
      on raw.month_start = series.month_start
  ),
  yearly as (
    select
      to_char(tasting_date, 'YYYY') as key,
      sum(quantity)::bigint as count
    from base
    where tasting_date is not null
    group by 1
  ),
  numeric_summary as (
    select
      case
        when sum(quantity) filter (where plato is not null) > 0
          then sum(plato * quantity) filter (where plato is not null)
            / sum(quantity) filter (where plato is not null)
        else null
      end as plato_average,
      min(plato) as plato_min,
      max(plato) as plato_max,
      coalesce(sum(quantity) filter (where plato is not null), 0)::bigint as plato_count,

      case
        when sum(quantity) filter (
          where abv is not null
            and not is_non_alcoholic
        ) > 0
          then sum(abv * quantity) filter (
            where abv is not null
              and not is_non_alcoholic
          )
          / sum(quantity) filter (
            where abv is not null
              and not is_non_alcoholic
          )
        else null
      end as abv_average,
      min(abv) filter (where not is_non_alcoholic) as abv_min,
      max(abv) filter (where not is_non_alcoholic) as abv_max,
      coalesce(sum(quantity) filter (
        where abv is not null
          and not is_non_alcoholic
      ), 0)::bigint as abv_count,

      case
        when sum(quantity) filter (where ibu is not null) > 0
          then sum(ibu * quantity) filter (where ibu is not null)
            / sum(quantity) filter (where ibu is not null)
        else null
      end as ibu_average,
      min(ibu) as ibu_min,
      max(ibu) as ibu_max,
      coalesce(sum(quantity) filter (where ibu is not null), 0)::bigint as ibu_count
    from base
  ),
  tasted_breweries as (
    select distinct
      br.id,
      br.name,
      br.city,
      br.latitude,
      br.longitude,
      br.closed_year
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    left join public.beer_versions bv
      on bv.id = t.beer_version_id
    join public.breweries br
      on br.id = coalesce(
        bv.brewery_id,
        b.brewery_id
      )
    where t.user_id = target_user_id
      and br.latitude is not null
      and br.longitude is not null
      and lower(
        extensions.unaccent(
          btrim(
            coalesce(
              br.country,
              ''
            )
          )
        )
      ) in (
        'cesko',
        'ceska republika',
        'czechia',
        'czech republic'
      )
  )
  select jsonb_build_object(
    'firstTasting',
    (
      select first_date::text
      from date_bounds
    ),
    'lastTasting',
    (
      select last_date::text
      from date_bounds
    ),
    'monthlyActivity',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key',
            to_char(month_start, 'YYYY-MM'),
            'count',
            count
          )
          order by month_start
        )
        from monthly
      ),
      '[]'::jsonb
    ),
    'yearlyActivity',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key',
            key,
            'count',
            count
          )
          order by key
        )
        from yearly
      ),
      '[]'::jsonb
    ),
    'mostActiveMonth',
    (
      select jsonb_build_object(
        'key',
        to_char(month_start, 'YYYY-MM'),
        'count',
        count
      )
      from monthly
      order by count desc, month_start asc
      limit 1
    ),
    'mostActiveYear',
    (
      select jsonb_build_object(
        'key',
        key,
        'count',
        count
      )
      from yearly
      order by count desc, key asc
      limit 1
    ),
    'averagePerMonth',
    case
      when (select count(*) from monthly) > 0
        then (
          select coalesce(sum(quantity), 0)::numeric
          from base
        ) / (
          select count(*)::numeric
          from monthly
        )
      else 0
    end,
    'plato',
    jsonb_build_object(
      'average',
      summary.plato_average,
      'min',
      summary.plato_min,
      'max',
      summary.plato_max,
      'count',
      summary.plato_count
    ),
    'abv',
    jsonb_build_object(
      'average',
      summary.abv_average,
      'min',
      summary.abv_min,
      'max',
      summary.abv_max,
      'count',
      summary.abv_count
    ),
    'ibu',
    jsonb_build_object(
      'average',
      summary.ibu_average,
      'min',
      summary.ibu_min,
      'max',
      summary.ibu_max,
      'count',
      summary.ibu_count
    ),
    'highestPlatoBeer',
    (
      select jsonb_build_object(
        'beerId',
        beer_id,
        'beerName',
        beer_name,
        'value',
        plato
      )
      from base
      where plato is not null
      order by plato desc, id asc
      limit 1
    ),
    'strongestBeer',
    (
      select jsonb_build_object(
        'beerId',
        beer_id,
        'beerName',
        beer_name,
        'value',
        abv
      )
      from base
      where abv is not null
        and not is_non_alcoholic
      order by abv desc, id asc
      limit 1
    ),
    'bitterestBeer',
    (
      select jsonb_build_object(
        'beerId',
        beer_id,
        'beerName',
        beer_name,
        'value',
        ibu
      )
      from base
      where ibu is not null
      order by ibu desc, id asc
      limit 1
    ),
    'czechBreweries',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',
            id,
            'name',
            name,
            'city',
            city,
            'latitude',
            latitude,
            'longitude',
            longitude,
            'closedYear',
            closed_year,
            'isPersonal',
            true
          )
          order by name
        )
        from tasted_breweries
      ),
      '[]'::jsonb
    )
  )
  from numeric_summary summary;
$function$


revoke all on function public.get_profile_stats_overview(uuid)
  from public;

grant execute on function public.get_profile_stats_overview(uuid)
  to authenticated;
