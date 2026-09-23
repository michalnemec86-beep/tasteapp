-- Private one-query integrity smoke test for maintenance and post-migration checks.

create or replace function private.pivnik_integrity_smoke()
returns jsonb
language sql
stable
security invoker
set search_path to ''
as $function$
with per_beer as (
  select
    be.id,
    count(bv.id) as version_count,
    count(*) filter (where bv.is_current) as current_count
  from public.beers be
  left join public.beer_versions bv on bv.beer_id = be.id
  group by be.id
),
current_payload_mismatch as (
  select be.id
  from public.beers be
  join public.beer_versions bv
    on bv.beer_id = be.id
   and bv.is_current
  where be.brewery_id is distinct from bv.brewery_id
     or be.plato is distinct from bv.plato
     or be.abv is distinct from bv.abv
     or be.ibu is distinct from bv.ibu
     or be.ebc is distinct from bv.ebc
     or be.style_id is distinct from bv.style_id
     or be.is_non_alcoholic is distinct from bv.is_non_alcoholic
),
current_hop_mismatch as (
  select be.id
  from public.beers be
  join public.beer_versions bv
    on bv.beer_id = be.id
   and bv.is_current
  where (
    select coalesce(array_agg(bh.hop_id order by bh.hop_id), '{}'::bigint[])
    from public.beer_hops bh
    where bh.beer_id = be.id
  ) is distinct from (
    select coalesce(array_agg(bvh.hop_id order by bvh.hop_id), '{}'::bigint[])
    from public.beer_version_hops bvh
    where bvh.beer_version_id = bv.id
  )
)
select jsonb_build_object(
  'beers_without_brewery',
    (select count(*) from public.beers where brewery_id is null),
  'beers_without_brand',
    (select count(*) from public.beers where brand_id is null),
  'beer_brand_not_linked_to_brewery',
    (
      select count(*)
      from public.beers be
      where be.brand_id is not null
        and not exists (
          select 1
          from public.brewery_brands bb
          where bb.brewery_id = be.brewery_id
            and bb.brand_id = be.brand_id
        )
    ),
  'beers_without_any_version',
    (select count(*) from per_beer where version_count = 0),
  'beers_without_current_version',
    (select count(*) from per_beer where current_count = 0),
  'beers_with_multiple_current_versions',
    (select count(*) from per_beer where current_count > 1),
  'current_payload_mismatches',
    (select count(*) from current_payload_mismatch),
  'current_hop_mismatches',
    (select count(*) from current_hop_mismatch),
  'tastings_without_beer',
    (select count(*) from public.tastings where beer_id is null),
  'tastings_without_version',
    (select count(*) from public.tastings where beer_version_id is null),
  'tasting_version_wrong_beer',
    (
      select count(*)
      from public.tastings t
      join public.beer_versions bv on bv.id = t.beer_version_id
      where bv.beer_id <> t.beer_id
    ),
  'current_versions_with_valid_to',
    (
      select count(*)
      from public.beer_versions
      where is_current
        and valid_to is not null
    ),
  'invalid_version_ranges',
    (
      select count(*)
      from public.beer_versions
      where valid_from is not null
        and valid_to is not null
        and valid_from > valid_to
    )
);
$function$;

revoke all on function private.pivnik_integrity_smoke() from public, anon, authenticated;
