drop trigger if exists beers_sync_current_version on public.beers;

create trigger beers_sync_current_version
after update of brewery_id, style_id, plato, abv, ibu on public.beers
for each row
execute function private.sync_current_beer_version();
