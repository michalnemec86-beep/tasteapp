-- Community members may create brands, styles and hops. Editing a shared
-- catalog term changes every beer using it, so only the administrator may do so.

create policy "Brand update admin barrier"
on public.brands
as restrictive
for update
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid)
with check ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

create policy "Beer style update admin barrier"
on public.beer_styles
as restrictive
for update
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid)
with check ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

create policy "Hop update admin barrier"
on public.hops
as restrictive
for update
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid)
with check ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);
