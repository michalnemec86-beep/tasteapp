-- Tasting history is immutable evidence and must never disappear because
-- an administrator or direct API client deletes a catalog beer.

alter table public.tastings
  drop constraint if exists tastings_beer_id_fkey;

alter table public.tastings
  add constraint tastings_beer_id_fkey
  foreign key (beer_id)
  references public.beers(id)
  on delete restrict;
