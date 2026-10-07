create extension if not exists unaccent with schema extensions;

create index if not exists tastings_tasted_on_idx
  on public.tastings (tasted_on);

create index if not exists tastings_user_tasted_on_idx
  on public.tastings (user_id, tasted_on);

CREATE OR REPLACE FUNCTION public.get_stats_dashboard(p_current_user uuid, p_selected_user uuid DEFAULT NULL::uuid, p_year integer DEFAULT NULL::integer, p_month integer DEFAULT NULL::integer, p_packaging text DEFAULT NULL::text, p_beer_id bigint DEFAULT NULL::bigint, p_brand_id bigint DEFAULT NULL::bigint, p_brewery_id bigint DEFAULT NULL::bigint, p_style_id bigint DEFAULT NULL::bigint, p_country text DEFAULT NULL::text, p_hop_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  with base as materialized (
    select
      t.id as tasting_id,
      t.user_id,
      coalesce(t.quantity, 1)::bigint as quantity,
      t.packaging,
      t.tasted_on,
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
    where
      (
        p_year is null
        or (
          t.tasted_on >= case
            when p_month between 1 and 12
              then make_date(p_year, p_month, 1)
            else make_date(p_year, 1, 1)
          end
          and t.tasted_on < case
            when p_month between 1 and 12
              then (make_date(p_year, p_month, 1) + interval '1 month')::date
            else make_date(p_year + 1, 1, 1)
          end
        )
      )
      and (p_packaging is null or t.packaging = p_packaging)
      and (p_beer_id is null or b.id = p_beer_id)
      and (p_brand_id is null or b.brand_id = p_brand_id)
      and (
        p_brewery_id is null
        or coalesce(bv.brewery_id, b.brewery_id) = p_brewery_id
      )
      and (
        p_style_id is null
        or coalesce(bv.style_id, b.style_id) = p_style_id
      )
      and (
        p_country is null
        or lower(extensions.unaccent(btrim(coalesce(brewery.country, ''))))
           = lower(extensions.unaccent(btrim(p_country)))
      )
      and (
        p_hop_id is null
        or case
          when t.beer_version_id is not null then exists (
            select 1
            from public.beer_version_hops bvh_filter
            where bvh_filter.beer_version_id = t.beer_version_id
              and bvh_filter.hop_id = p_hop_id
          )
          else exists (
            select 1
            from public.beer_hops bh_filter
            where bh_filter.beer_id = t.beer_id
              and bh_filter.hop_id = p_hop_id
          )
        end
      )
  ),
  scope_rows as materialized (
    select 'primary'::text as scope, base.*
    from base
    where p_selected_user is null or base.user_id = p_selected_user

    union all

    select 'personal'::text as scope, base.*
    from base
    where base.user_id = p_current_user

    union all

    select 'comparison'::text as scope, base.*
    from base
    where p_selected_user is not null
  ),
  scope_units as (
    select scope, sum(quantity)::bigint as units
    from scope_rows
    group by scope
  ),
  beer_rank as (
    select scope, beer_id as id, beer_name as name, sum(quantity)::bigint as count
    from scope_rows
    where beer_id is not null
    group by scope, beer_id, beer_name
  ),
  beer_json as (
    select
      scope,
      jsonb_agg(
        jsonb_build_object('id', id, 'name', name, 'count', count)
        order by count desc, name
      ) as full_items,
      jsonb_agg(
        jsonb_build_object('id', id, 'count', count)
        order by count desc, name
      ) as compact_items
    from beer_rank
    group by scope
  ),
  brand_brewery_usage as (
    select
      scope,
      brand_id,
      brewery_id,
      brewery_logo_url,
      sum(quantity)::bigint as count
    from scope_rows
    where brand_id is not null
      and brewery_id is not null
      and brewery_logo_url is not null
      and btrim(brewery_logo_url) <> ''
    group by scope, brand_id, brewery_id, brewery_logo_url
  ),
  brand_best_logo as (
    select distinct on (scope, brand_id)
      scope,
      brand_id,
      brewery_logo_url
    from brand_brewery_usage
    order by scope, brand_id, count desc, brewery_id
  ),
  brand_rank as (
    select
      rows.scope,
      rows.brand_id as id,
      rows.brand_name as name,
      sum(rows.quantity)::bigint as count,
      logo.brewery_logo_url as logo_url
    from scope_rows rows
    left join brand_best_logo logo
      on logo.scope = rows.scope
     and logo.brand_id = rows.brand_id
    where rows.brand_id is not null
      and rows.brand_name is not null
    group by rows.scope, rows.brand_id, rows.brand_name, logo.brewery_logo_url
  ),
  brand_json as (
    select
      scope,
      jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'id', id, 'name', name, 'count', count, 'logoUrl', logo_url
        ))
        order by count desc, name
      ) as full_items,
      jsonb_agg(
        jsonb_build_object('id', id, 'count', count)
        order by count desc, name
      ) as compact_items
    from brand_rank
    group by scope
  ),
  brewery_rank as (
    select
      scope,
      brewery_id as id,
      brewery_name as name,
      sum(quantity)::bigint as count,
      max(brewery_logo_url) filter (
        where brewery_logo_url is not null
          and btrim(brewery_logo_url) <> ''
      ) as logo_url
    from scope_rows
    where brewery_id is not null
      and brewery_name is not null
    group by scope, brewery_id, brewery_name
  ),
  brewery_json as (
    select
      scope,
      jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'id', id, 'name', name, 'count', count, 'logoUrl', logo_url
        ))
        order by count desc, name
      ) as full_items,
      jsonb_agg(
        jsonb_build_object('id', id, 'count', count)
        order by count desc, name
      ) as compact_items
    from brewery_rank
    group by scope
  ),
  style_rank as (
    select scope, style_id as id, style_name as name, sum(quantity)::bigint as count
    from scope_rows
    where style_id is not null
      and style_name is not null
    group by scope, style_id, style_name
  ),
  style_json as (
    select
      scope,
      jsonb_agg(
        jsonb_build_object('id', id, 'name', name, 'count', count)
        order by count desc, name
      ) as full_items,
      jsonb_agg(
        jsonb_build_object('id', id, 'count', count)
        order by count desc, name
      ) as compact_items
    from style_rank
    group by scope
  ),
  country_rank as (
    select
      scope,
      lower(extensions.unaccent(btrim(brewery_country))) as id,
      min(brewery_country) as name,
      sum(quantity)::bigint as count
    from scope_rows
    where brewery_country is not null
      and btrim(brewery_country) <> ''
    group by scope, lower(extensions.unaccent(btrim(brewery_country)))
  ),
  country_json as (
    select
      scope,
      jsonb_agg(
        jsonb_build_object('id', id, 'name', name, 'count', count)
        order by count desc, name
      ) as full_items,
      jsonb_agg(
        jsonb_build_object('id', id, 'count', count)
        order by count desc, name
      ) as compact_items
    from country_rank
    group by scope
  ),
  hop_rows as (
    select rows.scope, h.id, h.name, rows.quantity
    from scope_rows rows
    join public.beer_version_hops bvh
      on rows.beer_version_id is not null
     and bvh.beer_version_id = rows.beer_version_id
    join public.hops h
      on h.id = bvh.hop_id

    union all

    select rows.scope, h.id, h.name, rows.quantity
    from scope_rows rows
    join public.beer_hops bh
      on rows.beer_version_id is null
     and bh.beer_id = rows.beer_id
    join public.hops h
      on h.id = bh.hop_id
  ),
  hop_rank as (
    select scope, id, name, sum(quantity)::bigint as count
    from hop_rows
    group by scope, id, name
  ),
  hop_json as (
    select
      scope,
      jsonb_agg(
        jsonb_build_object('id', id, 'name', name, 'count', count)
        order by count desc, name
      ) as full_items,
      jsonb_agg(
        jsonb_build_object('id', id, 'count', count)
        order by count desc, name
      ) as compact_items
    from hop_rank
    group by scope
  ),
  packaging_rank as (
    select
      scope,
      packaging as id,
      case packaging
        when 'draft' then 'Čepované'
        when 'bottle' then 'Lahvové'
        when 'can' then 'Plechovka'
        when 'pet' then 'PET'
        when 'other' then 'Jiné'
        else packaging
      end as name,
      sum(quantity)::bigint as count
    from scope_rows
    where packaging is not null
    group by scope, packaging
  ),
  packaging_json as (
    select
      scope,
      jsonb_agg(
        jsonb_build_object('id', id, 'name', name, 'count', count)
        order by count desc, name
      ) as full_items,
      jsonb_agg(
        jsonb_build_object('id', id, 'count', count)
        order by count desc, name
      ) as compact_items
    from packaging_rank
    group by scope
  ),
  scope_payload as (
    select
      scopes.scope,
      jsonb_build_object(
        'units', coalesce(units.units, 0),
        'stats', jsonb_build_object(
          'beers', coalesce(
            case when scopes.scope = 'primary' then beers.full_items else beers.compact_items end,
            '[]'::jsonb
          ),
          'brands', coalesce(
            case when scopes.scope = 'primary' then brands.full_items else brands.compact_items end,
            '[]'::jsonb
          ),
          'breweries', coalesce(
            case when scopes.scope = 'primary' then breweries.full_items else breweries.compact_items end,
            '[]'::jsonb
          ),
          'styles', coalesce(
            case when scopes.scope = 'primary' then styles.full_items else styles.compact_items end,
            '[]'::jsonb
          ),
          'countries', coalesce(
            case when scopes.scope = 'primary' then countries_json.full_items else countries_json.compact_items end,
            '[]'::jsonb
          ),
          'hops', coalesce(
            case when scopes.scope = 'primary' then hops.full_items else hops.compact_items end,
            '[]'::jsonb
          ),
          'packaging', coalesce(
            case when scopes.scope = 'primary' then packaging.full_items else packaging.compact_items end,
            '[]'::jsonb
          )
        )
      ) as payload
    from (
      values ('primary'::text), ('personal'::text), ('comparison'::text)
    ) as scopes(scope)
    left join scope_units units using (scope)
    left join beer_json beers using (scope)
    left join brand_json brands using (scope)
    left join brewery_json breweries using (scope)
    left join style_json styles using (scope)
    left join country_json countries_json using (scope)
    left join hop_json hops using (scope)
    left join packaging_json packaging using (scope)
  )
  select jsonb_build_object(
    'primary',
    (select payload from scope_payload where scope = 'primary'),
    'comparison',
    case
      when p_selected_user is null
        then (select payload from scope_payload where scope = 'personal')
      else (select payload from scope_payload where scope = 'comparison')
    end,
    'personal',
    (select payload from scope_payload where scope = 'personal'),
    'labels',
    jsonb_strip_nulls(
      jsonb_build_object(
        'beer',
        case when p_beer_id is not null then (
          select name from public.beers where id = p_beer_id
        ) end,
        'brand',
        case when p_brand_id is not null then (
          select name from public.brands where id = p_brand_id
        ) end,
        'brewery',
        case when p_brewery_id is not null then (
          select name from public.breweries where id = p_brewery_id
        ) end,
        'style',
        case when p_style_id is not null then (
          select name from public.beer_styles where id = p_style_id
        ) end,
        'country',
        p_country,
        'hop',
        case when p_hop_id is not null then (
          select name from public.hops where id = p_hop_id
        ) end
      )
    )
  );
$function$


revoke all on function public.get_stats_dashboard(
  uuid, uuid, integer, integer, text, bigint, bigint, bigint, bigint, text, bigint
) from public;

grant execute on function public.get_stats_dashboard(
  uuid, uuid, integer, integer, text, bigint, bigint, bigint, bigint, text, bigint
) to authenticated;
