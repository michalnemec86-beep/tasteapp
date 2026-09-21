-- Preserve precise Plato values in catalog and tastings.
-- Beer versions already use unrestricted numeric precision.

drop trigger if exists beers_sync_current_version
on public.beers;

drop trigger if exists tastings_assign_beer_version
on public.tastings;

alter table public.beers
  alter column plato type numeric
  using plato::numeric;

alter table public.tastings
  alter column plato type numeric
  using plato::numeric;

create trigger beers_sync_current_version
after update of brewery_id, style_id, plato, abv, ibu, ebc, photo_url, notes, is_non_alcoholic
on public.beers
for each row
execute function private.sync_current_beer_version();

create trigger tastings_assign_beer_version
before insert or update of beer_id, tasted_on, plato, abv, ibu, beer_version_id
on public.tastings
for each row
execute function private.assign_tasting_beer_version();

do $sync$
begin
  perform set_config('beerapp.version_rpc', 'on', true);

  update public.beers b
  set plato = bv.plato
  from public.beer_versions bv
  where bv.beer_id = b.id
    and bv.is_current
    and bv.plato is not null
    and b.plato is distinct from bv.plato;

  perform set_config('beerapp.version_rpc', 'off', true);

  perform set_config('beerapp.version_parameter_sync', 'on', true);

  update public.tastings t
  set
    plato = coalesce(bv.plato, t.plato),
    abv = coalesce(bv.abv, t.abv),
    ibu = coalesce(bv.ibu, t.ibu)
  from public.beer_versions bv
  where bv.id = t.beer_version_id
    and (
      (bv.plato is not null and t.plato is distinct from bv.plato)
      or (bv.abv is not null and t.abv is distinct from bv.abv)
      or (bv.ibu is not null and t.ibu is distinct from bv.ibu)
    );

  perform set_config('beerapp.version_parameter_sync', 'off', true);
end;
$sync$;
