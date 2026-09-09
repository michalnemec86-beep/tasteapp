create schema if not exists private;

create or replace function private.freeze_current_beer_version(p_beer_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.beer_versions%rowtype;
  v_archive_id bigint;
  v_year smallint;
begin
  select *
    into v_current
  from public.beer_versions
  where beer_id = p_beer_id
    and is_current
  for update;

  if not found then
    return null;
  end if;

  if exists (
    select 1
    from public.tastings
    where beer_version_id = v_current.id
  ) then
    select max(extract(year from tasted_on))::smallint
      into v_year
    from public.tastings
    where beer_version_id = v_current.id;

    insert into public.beer_versions (
      beer_id, version_year, valid_from, valid_to,
      plato, abv, ibu, style_id, is_current, notes
    ) values (
      v_current.beer_id,
      coalesce(v_current.version_year, v_year),
      v_current.valid_from,
      v_current.valid_to,
      v_current.plato,
      v_current.abv,
      v_current.ibu,
      v_current.style_id,
      false,
      'Automaticky zmrazená předchozí katalogová verze'
    ) returning id into v_archive_id;

    insert into public.beer_version_hops (beer_version_id, hop_id)
    select v_archive_id, hop_id
    from public.beer_version_hops
    where beer_version_id = v_current.id
    on conflict do nothing;

    update public.tastings
    set beer_version_id = v_archive_id
    where beer_version_id = v_current.id;
  end if;

  return v_current.id;
end;
$$;

create or replace function private.ensure_current_beer_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.beer_versions
    where beer_id = new.id
      and is_current
  ) then
    insert into public.beer_versions (
      beer_id, plato, abv, ibu, style_id, is_current, notes
    ) values (
      new.id, new.plato, new.abv, new.ibu, new.style_id, true,
      'Aktuální katalogová verze'
    );
  end if;

  return new;
end;
$$;

create or replace function private.sync_current_beer_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_id bigint;
begin
  if old.style_id is not distinct from new.style_id
     and old.plato is not distinct from new.plato
     and old.abv is not distinct from new.abv
     and old.ibu is not distinct from new.ibu then
    return new;
  end if;

  v_current_id := private.freeze_current_beer_version(new.id);

  if v_current_id is null then
    insert into public.beer_versions (
      beer_id, plato, abv, ibu, style_id, is_current, notes
    ) values (
      new.id, new.plato, new.abv, new.ibu, new.style_id, true,
      'Aktuální katalogová verze'
    );
  else
    update public.beer_versions
    set plato = new.plato,
        abv = new.abv,
        ibu = new.ibu,
        style_id = new.style_id,
        version_year = null,
        valid_from = null,
        valid_to = null,
        notes = 'Aktuální katalogová verze'
    where id = v_current_id;
  end if;

  return new;
end;
$$;

create or replace function private.sync_current_version_hop_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_id bigint;
begin
  v_current_id := private.freeze_current_beer_version(new.beer_id);

  if v_current_id is not null then
    insert into public.beer_version_hops (beer_version_id, hop_id)
    values (v_current_id, new.hop_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create or replace function private.sync_current_version_hop_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_id bigint;
begin
  v_current_id := private.freeze_current_beer_version(old.beer_id);

  if v_current_id is not null then
    delete from public.beer_version_hops
    where beer_version_id = v_current_id
      and hop_id = old.hop_id;
  end if;

  return old;
end;
$$;

create or replace function private.assign_tasting_beer_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id bigint;
  v_current_id bigint;
  v_year smallint;
  v_style_id bigint;
begin
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

  select id
    into v_version_id
  from public.beer_versions
  where beer_id = new.beer_id
    and plato is not distinct from new.plato
    and abv is not distinct from new.abv
    and ibu is not distinct from new.ibu
  order by
    case when version_year = v_year then 0 else 1 end,
    is_current desc,
    id desc
  limit 1;

  if v_version_id is null then
    select id, style_id
      into v_current_id, v_style_id
    from public.beer_versions
    where beer_id = new.beer_id
      and is_current
    limit 1;

    if v_current_id is null then
      select style_id
        into v_style_id
      from public.beers
      where id = new.beer_id;

      insert into public.beer_versions (
        beer_id, plato, abv, ibu, style_id, is_current, notes
      ) values (
        new.beer_id, new.plato, new.abv, new.ibu, v_style_id, true,
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
        beer_id, version_year, plato, abv, ibu, style_id, is_current, notes
      ) values (
        new.beer_id, v_year, new.plato, new.abv, new.ibu, v_style_id, false,
        'Verze vytvořená z konkrétní ochutnávky'
      ) returning id into v_version_id;

      insert into public.beer_version_hops (beer_version_id, hop_id)
      select v_version_id, hop_id
      from public.beer_version_hops
      where beer_version_id = v_current_id
      on conflict do nothing;
    end if;
  end if;

  new.beer_version_id := v_version_id;
  return new;
end;
$$;

revoke all on function private.freeze_current_beer_version(bigint)
  from public;
revoke all on function private.freeze_current_beer_version(bigint)
  from anon;
revoke all on function private.freeze_current_beer_version(bigint)
  from authenticated;
revoke all on function private.ensure_current_beer_version()
  from public, anon, authenticated;
revoke all on function private.sync_current_beer_version()
  from public, anon, authenticated;
revoke all on function private.sync_current_version_hop_insert()
  from public, anon, authenticated;
revoke all on function private.sync_current_version_hop_delete()
  from public, anon, authenticated;
revoke all on function private.assign_tasting_beer_version()
  from public, anon, authenticated;

drop trigger if exists beers_ensure_current_version
  on public.beers;
drop trigger if exists beers_sync_current_version
  on public.beers;
drop trigger if exists beer_hops_sync_version_insert
  on public.beer_hops;
drop trigger if exists beer_hops_sync_version_delete
  on public.beer_hops;
drop trigger if exists tastings_assign_beer_version
  on public.tastings;

create trigger beers_ensure_current_version
  after insert on public.beers
  for each row
  execute function private.ensure_current_beer_version();

create trigger beers_sync_current_version
  after update of style_id, plato, abv, ibu on public.beers
  for each row
  execute function private.sync_current_beer_version();

create trigger beer_hops_sync_version_insert
  after insert on public.beer_hops
  for each row
  execute function private.sync_current_version_hop_insert();

create trigger beer_hops_sync_version_delete
  after delete on public.beer_hops
  for each row
  execute function private.sync_current_version_hop_delete();

create trigger tastings_assign_beer_version
  before insert or update of
    beer_id, tasted_on, plato, abv, ibu, beer_version_id
  on public.tastings
  for each row
  execute function private.assign_tasting_beer_version();
