-- Keep the user action rules in the database as well as in the forms.
-- NOT VALID preserves the few older incomplete brewery records while
-- requiring all newly inserted or updated records to have name and country.

alter table public.breweries
  add constraint breweries_name_country_required
  check (nullif(btrim(name), '') is not null and nullif(btrim(country), '') is not null)
  not valid;

alter table public.tastings
  add constraint tastings_required_presentation
  check (packaging in ('draft', 'bottle', 'can', 'pet', 'other') and quantity >= 1)
  not valid;

create policy "Beer style delete admin barrier"
on public.beer_styles
as restrictive
for delete
to authenticated
using ((select auth.uid()) = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid);

create or replace function private.guard_profile_nickname()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;
  if new.display_name is distinct from old.display_name
     and auth.uid() is distinct from '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid then
    raise exception 'Přezdívku může změnit jen administrátor.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_nickname
before update on public.profiles
for each row execute function private.guard_profile_nickname();

create or replace function private.guard_brewery_update_completeness()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role')
     or auth.uid() = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc'::uuid then
    return new;
  end if;

  -- A tasting can fill the missing country of an older brewery without
  -- changing any other catalog information.
  if old.country is null and nullif(btrim(new.country), '') is not null
     and row(new.name, new.city, new.address, new.website, new.logo_url,
             new.founded_year, new.closed_year, new.is_nomadic,
             new.latitude, new.longitude)
         is not distinct from
         row(old.name, old.city, old.address, old.website, old.logo_url,
             old.founded_year, old.closed_year, old.is_nomadic,
             old.latitude, old.longitude) then
    return new;
  end if;

  if nullif(btrim(new.city), '') is null
     or nullif(btrim(new.country), '') is null
     or nullif(btrim(new.website), '') is null
     or (not new.is_nomadic and nullif(btrim(new.address), '') is null) then
    raise exception 'Pro úpravu pivovaru je nutné vyplnit město, stát, web a adresu (kromě létajícího pivovaru).';
  end if;
  if new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
    raise exception 'Souřadnice může upravit pouze administrátor.';
  end if;
  return new;
end;
$$;

create trigger breweries_guard_complete_update
before update on public.breweries
for each row execute function private.guard_brewery_update_completeness();
