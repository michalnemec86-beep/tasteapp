-- Breweries are shared catalog entries. Only name and country are mandatory;
-- the existing authenticated INSERT/UPDATE policies already allow collaboration.
create or replace function private.guard_brewery_update_completeness()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if current_user in ('postgres', 'service_role')
     or auth.uid() = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid then
    return new;
  end if;

  if nullif(btrim(new.name), '') is null
     or nullif(btrim(new.country), '') is null then
    raise exception 'Pro úpravu pivovaru je nutné vyplnit název a stát.';
  end if;

  if new.latitude is distinct from old.latitude
     or new.longitude is distinct from old.longitude then
    raise exception 'Souřadnice může upravit pouze administrátor.';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_brewery_update_completeness()
  from public, anon, authenticated;
