-- ==================================================
-- TasteApp
-- Brewery Catalog V2
-- ==================================================

-- Rozšíření hlavní tabulky pivovarů
alter table public.breweries
  add column if not exists address text,
  add column if not exists founded_year integer,
  add column if not exists closed_year integer,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- ==================================================
-- Kontroly hodnot
-- ==================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'breweries_founded_year_check'
      and conrelid = 'public.breweries'::regclass
  ) then
    alter table public.breweries
      add constraint breweries_founded_year_check
      check (
        founded_year is null
        or founded_year between 1000 and 2100
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'breweries_closed_year_check'
      and conrelid = 'public.breweries'::regclass
  ) then
    alter table public.breweries
      add constraint breweries_closed_year_check
      check (
        closed_year is null
        or closed_year between 1000 and 2100
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'breweries_year_order_check'
      and conrelid = 'public.breweries'::regclass
  ) then
    alter table public.breweries
      add constraint breweries_year_order_check
      check (
        founded_year is null
        or closed_year is null
        or closed_year >= founded_year
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'breweries_latitude_check'
      and conrelid = 'public.breweries'::regclass
  ) then
    alter table public.breweries
      add constraint breweries_latitude_check
      check (
        latitude is null
        or latitude between -90 and 90
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'breweries_longitude_check'
      and conrelid = 'public.breweries'::regclass
  ) then
    alter table public.breweries
      add constraint breweries_longitude_check
      check (
        longitude is null
        or longitude between -180 and 180
      );
  end if;
end
$$;

-- ==================================================
-- Historie názvů pivovaru
-- ==================================================

create table if not exists public.brewery_name_history (
  id bigint generated always as identity primary key,

  brewery_id bigint not null
    references public.breweries(id)
    on delete cascade,

  previous_name text not null,
  changed_year integer,

  created_at timestamp with time zone
    not null default now(),

  constraint brewery_name_history_changed_year_check
    check (
      changed_year is null
      or changed_year between 1000 and 2100
    )
);

create index if not exists
  brewery_name_history_brewery_id_idx
on public.brewery_name_history (brewery_id);

-- ==================================================
-- RLS historie názvů
-- Stejný princip jako u breweries:
-- přihlášení uživatelé mohou data spravovat.
-- ==================================================

alter table public.brewery_name_history
enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brewery_name_history'
      and policyname =
        'Authenticated users can manage brewery name history'
  ) then
    create policy
      "Authenticated users can manage brewery name history"
    on public.brewery_name_history
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end
$$;
