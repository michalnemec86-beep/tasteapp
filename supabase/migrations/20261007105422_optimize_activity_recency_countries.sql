CREATE OR REPLACE FUNCTION public.get_activity_recency_dashboard(p_start_date date DEFAULT '2026-09-01'::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  with base as materialized (
    select
      t.id as tasting_id,
      t.tasted_on,
      t.tasted_at,
      coalesce(t.quantity, 1)::bigint as quantity,
      t.packaging,
      t.beer_version_id,
      b.id as beer_id,
      b.name as beer_name,
      b.brand_id,
      brand.name as brand_name,
      coalesce(bv.brewery_id, b.brewery_id) as brewery_id,
      brewery.name as brewery_name,
      brewery.country as brewery_country,
      brewery.logo_url as brewery_logo_url,
      coalesce(bv.style_id, b.style_id) as style_id,
      style.name as style_name
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    left join public.brands brand
      on brand.id = b.brand_id
    left join public.beer_versions bv
      on bv.id = t.beer_version_id
    left join public.breweries brewery
      on brewery.id = coalesce(bv.brewery_id, b.brewery_id)
    left join public.beer_styles style
      on style.id = coalesce(bv.style_id, b.style_id)
    where t.tasted_on >= p_start_date
  ),
  hop_rows as materialized (
    select
      base.tasting_id,
      base.tasted_on,
      base.tasted_at,
      h.id as hop_id,
      h.name as hop_name
    from base
    join public.beer_version_hops bvh
      on base.beer_version_id is not null
     and bvh.beer_version_id = base.beer_version_id
    join public.hops h
      on h.id = bvh.hop_id

    union all

    select
      base.tasting_id,
      base.tasted_on,
      base.tasted_at,
      h.id as hop_id,
      h.name as hop_name
    from base
    join public.beer_hops bh
      on base.beer_version_id is null
     and bh.beer_id = base.beer_id
    join public.hops h
      on h.id = bh.hop_id
  ),
  recent_breweries as (
    select *
    from (
      select
        brewery_id as id,
        brewery_name as name,
        brewery_logo_url as logo_url,
        tasted_on as activity_date,
        tasting_id as sort_id,
        row_number() over (
          partition by brewery_id
          order by tasted_on desc, tasted_at desc, tasting_id desc
        ) as rn
      from base
      where brewery_id is not null
        and brewery_name is not null
    ) ranked
    where rn = 1
    order by activity_date desc, sort_id desc
    limit 5
  ),
  recent_styles as (
    select *
    from (
      select
        style_id as id,
        style_name as name,
        tasted_on as activity_date,
        tasting_id as sort_id,
        row_number() over (
          partition by style_id
          order by tasted_on desc, tasted_at desc, tasting_id desc
        ) as rn
      from base
      where style_id is not null
        and style_name is not null
    ) ranked
    where rn = 1
    order by activity_date desc, sort_id desc
    limit 5
  ),
  recent_packaging as (
    select *
    from (
      select
        packaging as id,
        packaging as name,
        tasted_on as activity_date,
        tasting_id as sort_id,
        row_number() over (
          partition by packaging
          order by tasted_on desc, tasted_at desc, tasting_id desc
        ) as rn
      from base
      where packaging is not null
        and btrim(packaging) <> ''
    ) ranked
    where rn = 1
    order by activity_date desc, sort_id desc
    limit 5
  ),
  recent_beers as (
    select *
    from (
      select
        beer_id as id,
        beer_name as name,
        tasted_on as activity_date,
        tasting_id as sort_id,
        row_number() over (
          partition by beer_id
          order by tasted_on desc, tasted_at desc, tasting_id desc
        ) as rn
      from base
    ) ranked
    where rn = 1
    order by activity_date desc, sort_id desc
    limit 5
  ),
  recent_countries as (
    select *
    from (
      select
        lower(extensions.unaccent(btrim(brewery_country))) as id,
        brewery_country as name,
        tasted_on as activity_date,
        tasting_id as sort_id,
        row_number() over (
          partition by lower(extensions.unaccent(btrim(brewery_country)))
          order by tasted_on desc, tasted_at desc, tasting_id desc
        ) as rn
      from base
      where brewery_country is not null
        and btrim(brewery_country) <> ''
    ) ranked
    where rn = 1
    order by activity_date desc, sort_id desc
    limit 5
  ),
  recent_brands as (
    select *
    from (
      select
        brand_id as id,
        brand_name as name,
        tasted_on as activity_date,
        tasting_id as sort_id,
        row_number() over (
          partition by brand_id
          order by tasted_on desc, tasted_at desc, tasting_id desc
        ) as rn
      from base
      where brand_id is not null
        and brand_name is not null
    ) ranked
    where rn = 1
    order by activity_date desc, sort_id desc
    limit 5
  ),
  recent_hops as (
    select *
    from (
      select
        hop_id as id,
        hop_name as name,
        tasted_on as activity_date,
        tasting_id as sort_id,
        row_number() over (
          partition by hop_id
          order by tasted_on desc, tasted_at desc, tasting_id desc
        ) as rn
      from hop_rows
    ) ranked
    where rn = 1
    order by activity_date desc, sort_id desc
    limit 5
  ),
  new_breweries as (
    select
      brewery.id,
      brewery.name,
      brewery.logo_url,
      event.created_at::date as activity_date,
      event.id as sort_id
    from public.catalog_events event
    join public.breweries brewery
      on brewery.id = event.brewery_id
    where event.event_type = 'brewery_created'
      and event.created_at::date >= p_start_date
    order by event.created_at desc, event.id desc
    limit 5
  ),
  new_brands as (
    select
      brand.id,
      brand.name,
      null::text as logo_url,
      event.created_at::date as activity_date,
      event.id as sort_id
    from public.catalog_events event
    join public.brands brand
      on brand.id = event.brand_id
    where event.event_type = 'brand_created'
      and event.created_at::date >= p_start_date
    order by event.created_at desc, event.id desc
    limit 5
  ),
  new_hops as (
    select
      hop.id,
      hop.name,
      null::text as logo_url,
      event.created_at::date as activity_date,
      event.id as sort_id
    from public.catalog_events event
    join public.hops hop
      on hop.id = event.hop_id
    where event.event_type = 'hop_created'
      and event.created_at::date >= p_start_date
    order by event.created_at desc, event.id desc
    limit 5
  ),
  new_styles as (
    select
      style.id,
      style.name,
      null::text as logo_url,
      event.created_at::date as activity_date,
      event.id as sort_id
    from public.catalog_events event
    join public.beer_styles style
      on style.id = event.style_id
    where event.event_type = 'style_created'
      and event.created_at::date >= p_start_date
    order by event.created_at desc, event.id desc
    limit 5
  ),
  all_country_rows as materialized (
    select
      lower(extensions.unaccent(btrim(brewery.country))) as id,
      brewery.country as name,
      t.tasted_on,
      t.id as tasting_id
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    left join public.beer_versions bv
      on bv.id = t.beer_version_id
    left join public.breweries brewery
      on brewery.id = coalesce(bv.brewery_id, b.brewery_id)
    where brewery.country is not null
      and btrim(brewery.country) <> ''
  ),
  first_country_rows as (
    select distinct on (id)
      id,
      name,
      tasted_on as activity_date,
      tasting_id as sort_id
    from all_country_rows
    order by id, tasted_on asc, tasting_id asc
  ),
  first_countries as (
    select
      id,
      name,
      activity_date,
      sort_id
    from first_country_rows
    where activity_date >= p_start_date
    order by activity_date desc, sort_id desc
    limit 5
  )
  select jsonb_build_object(
    'startDate', p_start_date,
    'counts', jsonb_build_object(
      'units', coalesce((select sum(quantity) from base), 0),
      'beers', (select count(distinct beer_id) from base),
      'brands', (select count(distinct brand_id) from base where brand_id is not null),
      'breweries', (select count(distinct brewery_id) from base where brewery_id is not null),
      'styles', (select count(distinct style_id) from base where style_id is not null),
      'countries', (
        select count(distinct lower(extensions.unaccent(btrim(brewery_country))))
        from base
        where brewery_country is not null
          and btrim(brewery_country) <> ''
      ),
      'hops', (select count(distinct hop_id) from hop_rows)
    ),
    'recent', jsonb_build_object(
      'breweries', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'date', activity_date,
            'logoUrl', logo_url
          )
          order by activity_date desc, sort_id desc
        )
        from recent_breweries
      ), '[]'::jsonb),
      'styles', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from recent_styles
      ), '[]'::jsonb),
      'packaging', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from recent_packaging
      ), '[]'::jsonb),
      'beers', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from recent_beers
      ), '[]'::jsonb),
      'countries', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from recent_countries
      ), '[]'::jsonb),
      'brands', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from recent_brands
      ), '[]'::jsonb),
      'hops', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from recent_hops
      ), '[]'::jsonb)
    ),
    'news', jsonb_build_object(
      'breweries', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'date', activity_date,
            'logoUrl', logo_url
          )
          order by activity_date desc, sort_id desc
        )
        from new_breweries
      ), '[]'::jsonb),
      'brands', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from new_brands
      ), '[]'::jsonb),
      'hops', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from new_hops
      ), '[]'::jsonb),
      'styles', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from new_styles
      ), '[]'::jsonb),
      'countries', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'date', activity_date)
          order by activity_date desc, sort_id desc
        )
        from first_countries
      ), '[]'::jsonb)
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_activity_recency_list(p_kind text, p_start_date date DEFAULT '2026-09-01'::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  with base as materialized (
    select
      t.id as tasting_id,
      t.tasted_on,
      t.tasted_at,
      t.packaging,
      t.beer_version_id,
      b.id as beer_id,
      b.name as beer_name,
      b.brand_id,
      brand.name as brand_name,
      coalesce(bv.brewery_id, b.brewery_id) as brewery_id,
      brewery.name as brewery_name,
      brewery.country as brewery_country,
      brewery.logo_url as brewery_logo_url,
      coalesce(bv.style_id, b.style_id) as style_id,
      style.name as style_name
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    left join public.brands brand
      on brand.id = b.brand_id
    left join public.beer_versions bv
      on bv.id = t.beer_version_id
    left join public.breweries brewery
      on brewery.id = coalesce(bv.brewery_id, b.brewery_id)
    left join public.beer_styles style
      on style.id = coalesce(bv.style_id, b.style_id)
    where t.tasted_on >= p_start_date
  ),
  hop_rows as materialized (
    select
      base.tasting_id,
      base.tasted_on,
      base.tasted_at,
      h.id as hop_id,
      h.name as hop_name
    from base
    join public.beer_version_hops bvh
      on base.beer_version_id is not null
     and bvh.beer_version_id = base.beer_version_id
    join public.hops h
      on h.id = bvh.hop_id

    union all

    select
      base.tasting_id,
      base.tasted_on,
      base.tasted_at,
      h.id as hop_id,
      h.name as hop_name
    from base
    join public.beer_hops bh
      on base.beer_version_id is null
     and bh.beer_id = base.beer_id
    join public.hops h
      on h.id = bh.hop_id
  ),
  items as (
    select
      'recent-breweries'::text as kind,
      brewery_id::text as id,
      brewery_name as name,
      brewery_logo_url as logo_url,
      tasted_on as activity_date,
      tasting_id as sort_id,
      row_number() over (
        partition by brewery_id
        order by tasted_on desc, tasted_at desc, tasting_id desc
      ) as rn
    from base
    where brewery_id is not null
      and brewery_name is not null

    union all

    select
      'recent-styles',
      style_id::text,
      style_name,
      null::text,
      tasted_on,
      tasting_id,
      row_number() over (
        partition by style_id
        order by tasted_on desc, tasted_at desc, tasting_id desc
      )
    from base
    where style_id is not null
      and style_name is not null

    union all

    select
      'recent-packaging',
      packaging,
      packaging,
      null::text,
      tasted_on,
      tasting_id,
      row_number() over (
        partition by packaging
        order by tasted_on desc, tasted_at desc, tasting_id desc
      )
    from base
    where packaging is not null
      and btrim(packaging) <> ''

    union all

    select
      'recent-beers',
      beer_id::text,
      beer_name,
      null::text,
      tasted_on,
      tasting_id,
      row_number() over (
        partition by beer_id
        order by tasted_on desc, tasted_at desc, tasting_id desc
      )
    from base

    union all

    select
      'recent-countries',
      lower(extensions.unaccent(btrim(brewery_country))),
      brewery_country,
      null::text,
      tasted_on,
      tasting_id,
      row_number() over (
        partition by lower(extensions.unaccent(btrim(brewery_country)))
        order by tasted_on desc, tasted_at desc, tasting_id desc
      )
    from base
    where brewery_country is not null
      and btrim(brewery_country) <> ''

    union all

    select
      'recent-brands',
      brand_id::text,
      brand_name,
      null::text,
      tasted_on,
      tasting_id,
      row_number() over (
        partition by brand_id
        order by tasted_on desc, tasted_at desc, tasting_id desc
      )
    from base
    where brand_id is not null
      and brand_name is not null

    union all

    select
      'recent-hops',
      hop_id::text,
      hop_name,
      null::text,
      tasted_on,
      tasting_id,
      row_number() over (
        partition by hop_id
        order by tasted_on desc, tasted_at desc, tasting_id desc
      )
    from hop_rows
  ),
  catalog_items as (
    select
      'news-breweries'::text as kind,
      brewery.id::text as id,
      brewery.name,
      brewery.logo_url,
      event.created_at::date as activity_date,
      event.id as sort_id
    from public.catalog_events event
    join public.breweries brewery
      on brewery.id = event.brewery_id
    where event.event_type = 'brewery_created'
      and event.created_at::date >= p_start_date

    union all

    select
      'news-brands',
      brand.id::text,
      brand.name,
      null::text,
      event.created_at::date,
      event.id
    from public.catalog_events event
    join public.brands brand
      on brand.id = event.brand_id
    where event.event_type = 'brand_created'
      and event.created_at::date >= p_start_date

    union all

    select
      'news-hops',
      hop.id::text,
      hop.name,
      null::text,
      event.created_at::date,
      event.id
    from public.catalog_events event
    join public.hops hop
      on hop.id = event.hop_id
    where event.event_type = 'hop_created'
      and event.created_at::date >= p_start_date

    union all

    select
      'news-styles',
      style.id::text,
      style.name,
      null::text,
      event.created_at::date,
      event.id
    from public.catalog_events event
    join public.beer_styles style
      on style.id = event.style_id
    where event.event_type = 'style_created'
      and event.created_at::date >= p_start_date
  ),
  all_country_rows as materialized (
    select
      lower(extensions.unaccent(btrim(brewery.country))) as id,
      brewery.country as name,
      t.tasted_on,
      t.id as tasting_id
    from public.tastings t
    join public.beers b
      on b.id = t.beer_id
    left join public.beer_versions bv
      on bv.id = t.beer_version_id
    left join public.breweries brewery
      on brewery.id = coalesce(bv.brewery_id, b.brewery_id)
    where brewery.country is not null
      and btrim(brewery.country) <> ''
  ),
  first_country_rows as (
    select distinct on (id)
      id,
      name,
      tasted_on as activity_date,
      tasting_id as sort_id
    from all_country_rows
    order by id, tasted_on asc, tasting_id asc
  ),
  first_countries as (
    select
      'news-countries'::text as kind,
      id,
      name,
      null::text as logo_url,
      activity_date,
      sort_id
    from first_country_rows
    where activity_date >= p_start_date
  ),
  selected as (
    select kind, id, name, logo_url, activity_date, sort_id
    from items
    where rn = 1
      and kind = p_kind

    union all

    select kind, id, name, logo_url, activity_date, sort_id
    from catalog_items
    where kind = p_kind

    union all

    select kind, id, name, logo_url, activity_date, sort_id
    from first_countries
    where kind = p_kind
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'date', activity_date,
        'logoUrl', logo_url
      )
      order by activity_date desc, sort_id desc, name
    ),
    '[]'::jsonb
  )
  from selected;
$function$;
