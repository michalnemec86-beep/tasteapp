-- Harden catalog authorization without breaking community creation flows.
-- Restrictive policies are ANDed with the older permissive policies, so
-- authenticated users keep normal read/create workflows while destructive
-- catalog changes can no longer bypass the intended guards.

drop policy if exists "Beer insert ownership barrier" on public.beers;
create policy "Beer insert ownership barrier"
on public.beers
as restrictive
for insert
to authenticated
with check (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or created_by = (select auth.uid())
);

drop policy if exists "Beer update admin barrier" on public.beers;
create policy "Beer update admin barrier"
on public.beers
as restrictive
for update
to authenticated
using (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
)
with check (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
);

drop policy if exists "Beer delete safety barrier" on public.beers;
create policy "Beer delete safety barrier"
on public.beers
as restrictive
for delete
to authenticated
using (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or (
    created_by = (select auth.uid())
    and not is_catalog
    and not exists (
      select 1 from public.tastings t where t.beer_id = beers.id
    )
  )
);

drop policy if exists "Brand delete admin barrier" on public.brands;
create policy "Brand delete admin barrier"
on public.brands
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Brewery delete admin barrier" on public.breweries;
create policy "Brewery delete admin barrier"
on public.breweries
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Hop delete admin barrier" on public.hops;
create policy "Hop delete admin barrier"
on public.hops
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Brewery brand delete admin barrier" on public.brewery_brands;
create policy "Brewery brand delete admin barrier"
on public.brewery_brands
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Beer version insert ownership barrier" on public.beer_versions;
create policy "Beer version insert ownership barrier"
on public.beer_versions
as restrictive
for insert
to authenticated
with check (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or created_by = (select auth.uid())
);

drop policy if exists "Beer version update ownership barrier" on public.beer_versions;
create policy "Beer version update ownership barrier"
on public.beer_versions
as restrictive
for update
to authenticated
using (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or (
    created_by = (select auth.uid())
    and not exists (
      select 1 from public.tastings t where t.beer_version_id = beer_versions.id
    )
  )
)
with check (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or created_by = (select auth.uid())
);

drop policy if exists "Beer version delete admin barrier" on public.beer_versions;
create policy "Beer version delete admin barrier"
on public.beer_versions
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

drop policy if exists "Beer hop insert ownership barrier" on public.beer_hops;
create policy "Beer hop insert ownership barrier"
on public.beer_hops
as restrictive
for insert
to authenticated
with check (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or exists (
    select 1 from public.beers be
    where be.id = beer_hops.beer_id
      and be.created_by = (select auth.uid())
  )
);

drop policy if exists "Beer hop delete ownership barrier" on public.beer_hops;
create policy "Beer hop delete ownership barrier"
on public.beer_hops
as restrictive
for delete
to authenticated
using (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or exists (
    select 1 from public.beers be
    where be.id = beer_hops.beer_id
      and be.created_by = (select auth.uid())
  )
);

drop policy if exists "Version hop insert ownership barrier" on public.beer_version_hops;
create policy "Version hop insert ownership barrier"
on public.beer_version_hops
as restrictive
for insert
to authenticated
with check (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or exists (
    select 1
    from public.beer_versions bv
    where bv.id = beer_version_hops.beer_version_id
      and (
        bv.created_by = (select auth.uid())
        or exists (
          select 1
          from public.tastings t
          where t.beer_version_id = bv.id
            and t.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Version hop delete ownership barrier" on public.beer_version_hops;
create policy "Version hop delete ownership barrier"
on public.beer_version_hops
as restrictive
for delete
to authenticated
using (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or exists (
    select 1
    from public.beer_versions bv
    where bv.id = beer_version_hops.beer_version_id
      and bv.created_by = (select auth.uid())
  )
);

drop policy if exists "Version collaborator insert ownership barrier" on public.beer_version_collaborators;
create policy "Version collaborator insert ownership barrier"
on public.beer_version_collaborators
as restrictive
for insert
to authenticated
with check (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or exists (
    select 1
    from public.beer_versions bv
    where bv.id = beer_version_collaborators.beer_version_id
      and (
        bv.created_by = (select auth.uid())
        or exists (
          select 1
          from public.tastings t
          where t.beer_version_id = bv.id
            and t.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Version collaborator delete ownership barrier" on public.beer_version_collaborators;
create policy "Version collaborator delete ownership barrier"
on public.beer_version_collaborators
as restrictive
for delete
to authenticated
using (
  (select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid
  or exists (
    select 1
    from public.beer_versions bv
    where bv.id = beer_version_collaborators.beer_version_id
      and bv.created_by = (select auth.uid())
  )
);
