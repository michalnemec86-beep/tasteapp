-- ==================================================
-- TasteApp
-- Pivovar dne
-- ==================================================

create table if not exists public.brewery_of_day (
  day date primary key,

  brewery_id bigint not null
    references public.breweries(id)
    on delete restrict,

  created_at timestamp with time zone
    not null default now()
);

create index if not exists
  brewery_of_day_brewery_id_idx
on public.brewery_of_day (brewery_id);

-- ==================================================
-- RLS
-- ==================================================

alter table public.brewery_of_day
enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brewery_of_day'
      and policyname =
        'Authenticated users can read brewery of day'
  ) then
    create policy
      "Authenticated users can read brewery of day"
    on public.brewery_of_day
    for select
    to authenticated
    using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brewery_of_day'
      and policyname =
        'Authenticated users can create brewery of day'
  ) then
    create policy
      "Authenticated users can create brewery of day"
    on public.brewery_of_day
    for insert
    to authenticated
    with check (true);
  end if;
end
$$;

grant select, insert
on public.brewery_of_day
to authenticated;
