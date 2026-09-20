-- Keep public catalog timeline events limited to actions that originate
-- from a real authenticated app user.
--
-- Direct SQL maintenance, imports and backend enrichment run without
-- auth.uid(), so their catalog changes stay silent on the public timeline.

create or replace function private.keep_catalog_timeline_user_origin_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function private.keep_catalog_timeline_user_origin_only()
from public, anon, authenticated;

drop trigger if exists catalog_events_user_origin_only
on public.catalog_events;

create trigger catalog_events_user_origin_only
before insert on public.catalog_events
for each row
execute function private.keep_catalog_timeline_user_origin_only();
