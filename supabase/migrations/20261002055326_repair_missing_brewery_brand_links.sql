-- Restore existing catalog associations without changing beer identities or creating timeline events.
insert into public.brewery_brands (brewery_id, brand_id)
select distinct be.brewery_id, be.brand_id
from public.beers be
where be.brewery_id is not null and be.brand_id is not null
  and not exists (
    select 1 from public.brewery_brands bb
    where bb.brewery_id = be.brewery_id and bb.brand_id = be.brand_id
  )
  and not exists (
    select 1 from public.beer_versions bv
    join public.brewery_brands bb
      on bb.brewery_id = bv.brewed_for_brewery_id and bb.brand_id = be.brand_id
    where bv.beer_id = be.id and bv.is_current and bv.brewed_for_brewery_id is not null
  )
on conflict (brewery_id, brand_id) do nothing;
