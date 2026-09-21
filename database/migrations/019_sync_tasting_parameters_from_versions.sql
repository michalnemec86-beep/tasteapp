-- Keep tasting technical parameters synchronized with their assigned beer version.
-- This ensures user and aggregate statistics reflect verified catalog corrections.

create or replace function private.assign_tasting_beer_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_version_id bigint;
  v_current_id bigint;
  v_template_id bigint;
  v_year smallint;
  v_style_id bigint;
  v_brewery_id bigint;
begin
  if current_setting('beerapp.version_parameter_sync', true) = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
       old.beer_id is distinct from new.beer_id
       or old.tasted_on is distinct from new.tasted_on
       or old.plato is distinct from new.plato
       or old.abv is distinct from new.abv
       or old.ibu is distinct from new.ibu
     ) then
    new.beer_version_id := null;
  end if;

  if new.beer_version_id is not null then
    if exists (
      select 1
      from public.beer_versions
      where id = new.beer_version_id
        and beer_id = new.beer_id
    ) then
      return new;
    end if;
    new.beer_version_id := null;
  end if;

  v_year := extract(year from new.tasted_on)::smallint;

  select id into v_version_id
  from public.beer_versions
  where beer_id = new.beer_id
    and version_year = v_year
    and plato is not distinct from new.plato
    and abv is not distinct from new.abv
    and ibu is not distinct from new.ibu
  order by id desc
  limit 1;

  if v_version_id is null then
    select id into v_version_id
    from public.beer_versions
    where beer_id = new.beer_id
      and is_current
      and plato is not distinct from new.plato
      and abv is not distinct from new.abv
      and ibu is not distinct from new.ibu
    order by id desc
    limit 1;
  end if;

  if v_version_id is null then
    select id, style_id, brewery_id
      into v_template_id, v_style_id, v_brewery_id
    from public.beer_versions
    where beer_id = new.beer_id
      and not is_current
      and version_year is distinct from v_year
      and plato is not distinct from new.plato
      and abv is not distinct from new.abv
      and ibu is not distinct from new.ibu
    order by abs(coalesce(version_year, v_year)::int - v_year::int), id desc
    limit 1;

    if v_template_id is not null then
      insert into public.beer_versions (
        beer_id, brewery_id, version_year, plato, abv, ibu, style_id, is_current, notes
      ) values (
        new.beer_id, v_brewery_id, v_year, new.plato, new.abv, new.ibu, v_style_id, false,
        'Verze vytvořená z historické receptury stejného složení'
      ) returning id into v_version_id;

      insert into public.beer_version_hops (beer_version_id, hop_id)
      select v_version_id, hop_id
      from public.beer_version_hops
      where beer_version_id = v_template_id
      on conflict do nothing;
    else
      select id, style_id, brewery_id
        into v_current_id, v_style_id, v_brewery_id
      from public.beer_versions
      where beer_id = new.beer_id
        and is_current
      limit 1;

      if v_current_id is null then
        select style_id, brewery_id
          into v_style_id, v_brewery_id
        from public.beers
        where id = new.beer_id;

        insert into public.beer_versions (
          beer_id, brewery_id, plato, abv, ibu, style_id, is_current, notes
        ) values (
          new.beer_id, v_brewery_id, new.plato, new.abv, new.ibu, v_style_id, true,
          'Aktuální katalogová verze'
        ) returning id into v_current_id;

        insert into public.beer_version_hops (beer_version_id, hop_id)
        select v_current_id, hop_id
        from public.beer_hops
        where beer_id = new.beer_id
        on conflict do nothing;

        v_version_id := v_current_id;
      else
        insert into public.beer_versions (
          beer_id, brewery_id, version_year, plato, abv, ibu, style_id, is_current, notes
        ) values (
          new.beer_id, v_brewery_id, v_year, new.plato, new.abv, new.ibu, v_style_id, false,
          'Verze vytvořená z konkrétní ochutnávky'
        ) returning id into v_version_id;

        insert into public.beer_version_hops (beer_version_id, hop_id)
        select v_version_id, hop_id
        from public.beer_version_hops
        where beer_version_id = v_current_id
        on conflict do nothing;
      end if;
    end if;
  end if;

  new.beer_version_id := v_version_id;
  return new;
end;
$function$;

create or replace function private.sync_tasting_parameters_from_beer_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.plato is not distinct from new.plato
     and old.abv is not distinct from new.abv
     and old.ibu is not distinct from new.ibu then
    return new;
  end if;

  perform set_config('beerapp.version_parameter_sync', 'on', true);

  update public.tastings
  set
    plato = case
      when old.plato is distinct from new.plato then new.plato
      else plato
    end,
    abv = case
      when old.abv is distinct from new.abv then new.abv
      else abv
    end,
    ibu = case
      when old.ibu is distinct from new.ibu then new.ibu
      else ibu
    end
  where beer_version_id = new.id
    and (
      (old.plato is distinct from new.plato and plato is distinct from new.plato)
      or (old.abv is distinct from new.abv and abv is distinct from new.abv)
      or (old.ibu is distinct from new.ibu and ibu is distinct from new.ibu)
    );

  perform set_config('beerapp.version_parameter_sync', 'off', true);
  return new;
exception
  when others then
    perform set_config('beerapp.version_parameter_sync', 'off', true);
    raise;
end;
$function$;

revoke all on function private.sync_tasting_parameters_from_beer_version()
from public, anon, authenticated;

drop trigger if exists beer_versions_sync_tasting_parameters
on public.beer_versions;

create trigger beer_versions_sync_tasting_parameters
after update of plato, abv, ibu
on public.beer_versions
for each row
execute function private.sync_tasting_parameters_from_beer_version();

do $backfill$
begin
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
$backfill$;
