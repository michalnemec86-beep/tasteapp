-- Supporting indexes and stable auth lookups for the catalog additions.

create index if not exists beers_catalog_confirmed_by_idx
  on public.beers (catalog_confirmed_by);
create index if not exists beers_created_by_idx
  on public.beers (created_by);
create index if not exists beer_versions_created_by_idx
  on public.beer_versions (created_by);
create index if not exists beer_versions_supersedes_version_id_idx
  on public.beer_versions (supersedes_version_id);
create index if not exists brewery_brands_brand_id_idx
  on public.brewery_brands (brand_id);
create index if not exists brewery_brands_created_by_idx
  on public.brewery_brands (created_by);
create index if not exists catalog_events_actor_user_id_idx
  on public.catalog_events (actor_user_id);
create index if not exists catalog_events_beer_id_idx
  on public.catalog_events (beer_id);
create index if not exists catalog_events_brewery_id_idx
  on public.catalog_events (brewery_id);

drop policy if exists "Authenticated users can create brewery brands" on public.brewery_brands;
create policy "Authenticated users can create brewery brands"
  on public.brewery_brands for insert to authenticated
  with check (created_by is null or created_by = (select auth.uid()));

drop policy if exists "Authenticated users can create own catalog events" on public.catalog_events;
create policy "Authenticated users can create own catalog events"
  on public.catalog_events for insert to authenticated
  with check (actor_user_id = (select auth.uid()));
