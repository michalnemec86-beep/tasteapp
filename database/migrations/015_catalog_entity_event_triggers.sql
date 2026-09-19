create or replace function private.record_catalog_entity_created()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return new;
  end if;

  if tg_table_name = 'brands' then
    insert into public.catalog_events (
      actor_user_id,
      brand_id,
      event_type
    ) values (
      v_user_id,
      new.id,
      'brand_created'
    );
  elsif tg_table_name = 'breweries' then
    insert into public.catalog_events (
      actor_user_id,
      brewery_id,
      event_type
    ) values (
      v_user_id,
      new.id,
      'brewery_created'
    );
  elsif tg_table_name = 'hops' then
    insert into public.catalog_events (
      actor_user_id,
      hop_id,
      event_type
    ) values (
      v_user_id,
      new.id,
      'hop_created'
    );
  end if;

  return new;
end;
$function$;

revoke all on function private.record_catalog_entity_created() from public, anon, authenticated;

drop trigger if exists brands_record_catalog_event on public.brands;
create trigger brands_record_catalog_event
after insert on public.brands
for each row execute function private.record_catalog_entity_created();

drop trigger if exists breweries_record_catalog_event on public.breweries;
create trigger breweries_record_catalog_event
after insert on public.breweries
for each row execute function private.record_catalog_entity_created();

drop trigger if exists hops_record_catalog_event on public.hops;
create trigger hops_record_catalog_event
after insert on public.hops
for each row execute function private.record_catalog_entity_created();
