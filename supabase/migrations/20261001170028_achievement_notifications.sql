alter table public.user_achievements
  add column notification_seen_at timestamptz;

-- Ocenění získaná před zavedením oznámení zpětně nevyskakují.
update public.user_achievements
set notification_seen_at = now();

-- Dosud neexistovala UPDATE policy. Povolujeme jen potvrzení
-- vlastního oznámení, nikoli změnu ocenění, jeho majitele či data.
revoke update on public.user_achievements from anon, authenticated;
grant update (notification_seen_at) on public.user_achievements to authenticated;

create policy "Users can dismiss own achievement notifications"
on public.user_achievements
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on column public.user_achievements.notification_seen_at is
  'Čas zavření oznámení o zisku ocenění; NULL = čeká na zobrazení.';
