-- Community users may create and edit catalog data through guarded workflows,
-- but physical deletion is maintenance-only and historical versions are immutable.

drop policy if exists "Beer delete respects tasting protection" on public.beers;
drop policy if exists "Catalog beer delete admin only" on public.beers;
create policy "Catalog beer delete admin only"
on public.beers
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Catalog brewery delete admin only" on public.breweries;
create policy "Catalog brewery delete admin only"
on public.breweries
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Catalog brand delete admin only" on public.brands;
create policy "Catalog brand delete admin only"
on public.brands
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Catalog hop delete admin only" on public.hops;
create policy "Catalog hop delete admin only"
on public.hops
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Beer version update admin only" on public.beer_versions;
create policy "Beer version update admin only"
on public.beer_versions
as restrictive
for update
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid)
with check ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Beer version delete admin only" on public.beer_versions;
create policy "Beer version delete admin only"
on public.beer_versions
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

alter table public.tastings
  drop constraint if exists tastings_beer_version_id_fkey;

alter table public.tastings
  add constraint tastings_beer_version_id_fkey
  foreign key (beer_version_id)
  references public.beer_versions(id)
  on delete restrict;
