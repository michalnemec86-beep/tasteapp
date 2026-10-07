CREATE OR REPLACE FUNCTION public.get_brewery_catalog_stats()
 RETURNS TABLE(brewery_id bigint, beer_count bigint, tasted_beer_count bigint, brand_count bigint, brand_ids jsonb, brand_names jsonb, consumed_count bigint, user_stats jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with catalog as (
    select
      b.brewery_id,
      count(distinct b.id)::bigint as beer_count,
      count(distinct b.brand_id) filter (
        where b.brand_id is not null
      )::bigint as brand_count,
      coalesce(
        jsonb_agg(
          distinct b.brand_id
        ) filter (
          where b.brand_id is not null
        ),
        '[]'::jsonb
      ) as brand_ids,
      coalesce(
        jsonb_agg(
          distinct br.name
        ) filter (
          where br.name is not null
            and btrim(br.name) <> ''
        ),
        '[]'::jsonb
      ) as brand_names
    from public.beers b
    left join public.brands br
      on br.id = b.brand_id
    where b.brewery_id is not null
    group by b.brewery_id
  ),
  tasting_totals as (
    select
      b.brewery_id,
      count(
        distinct t.beer_id
      )::bigint as tasted_beer_count,
      coalesce(
        sum(
          coalesce(
            t.quantity,
            1
          )
        ),
        0
      )::bigint as consumed_count
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    where b.brewery_id is not null
    group by b.brewery_id
  ),
  per_user as (
    select
      b.brewery_id,
      t.user_id,
      count(
        distinct t.beer_id
      )::bigint as beer_count,
      count(
        distinct b.brand_id
      ) filter (
        where b.brand_id is not null
      )::bigint as brand_count,
      coalesce(
        sum(
          coalesce(
            t.quantity,
            1
          )
        ),
        0
      )::bigint as consumed_count
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    where b.brewery_id is not null
      and t.user_id is not null
    group by
      b.brewery_id,
      t.user_id
  ),
  users as (
    select
      brewery_id,
      jsonb_object_agg(
        user_id::text,
        jsonb_build_object(
          'beerCount',
          beer_count,
          'brandCount',
          brand_count,
          'consumedCount',
          consumed_count
        )
      ) as user_stats
    from per_user
    group by brewery_id
  )
  select
    catalog.brewery_id::bigint,
    catalog.beer_count,
    coalesce(
      tasting_totals.tasted_beer_count,
      0
    )::bigint as tasted_beer_count,
    catalog.brand_count,
    catalog.brand_ids,
    catalog.brand_names,
    coalesce(
      tasting_totals.consumed_count,
      0
    )::bigint as consumed_count,
    coalesce(
      users.user_stats,
      '{}'::jsonb
    ) as user_stats
  from catalog
  left join tasting_totals
    using (brewery_id)
  left join users
    using (brewery_id);
$function$


revoke all on function public.get_brewery_catalog_stats()
  from public;

grant execute on function public.get_brewery_catalog_stats()
  to authenticated;

CREATE OR REPLACE FUNCTION public.get_beer_catalog_tasting_counts(target_user_id uuid)
 RETURNS TABLE(beer_id bigint, total_quantity bigint, my_quantity bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    t.beer_id::bigint,
    coalesce(
      sum(
        coalesce(
          t.quantity,
          1
        )
      ),
      0
    )::bigint as total_quantity,
    coalesce(
      sum(
        coalesce(
          t.quantity,
          1
        )
      ) filter (
        where t.user_id =
          target_user_id
      ),
      0
    )::bigint as my_quantity
  from public.tastings t
  where t.beer_id is not null
  group by t.beer_id;
$function$


revoke all on function public.get_beer_catalog_tasting_counts(uuid)
  from public;

grant execute on function public.get_beer_catalog_tasting_counts(uuid)
  to authenticated;

CREATE OR REPLACE FUNCTION public.get_beer_catalog_overview(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'total',
    (
      select count(*)::bigint
      from public.beers
    ),
    'tasted',
    (
      select count(
        distinct beer_id
      )::bigint
      from public.tastings
      where beer_id is not null
    ),
    'mine',
    (
      select count(
        distinct beer_id
      )::bigint
      from public.tastings
      where user_id =
        target_user_id
        and beer_id is not null
    )
  );
$function$


revoke all on function public.get_beer_catalog_overview(uuid)
  from public;

grant execute on function public.get_beer_catalog_overview(uuid)
  to authenticated;
