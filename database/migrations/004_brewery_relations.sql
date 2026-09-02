create table if not exists public.brewery_relations (
  id bigint generated always as identity primary key,

  from_brewery_id bigint not null
    references public.breweries(id)
    on delete cascade,

  to_brewery_id bigint not null
    references public.breweries(id)
    on delete cascade,

  relation_type text not null,

  relation_year integer,

  note text,

  created_at timestamp with time zone
    not null default now(),

  constraint brewery_relations_different_breweries_check
    check (
      from_brewery_id <> to_brewery_id
    ),

  constraint brewery_relations_year_check
    check (
      relation_year is null
      or relation_year between 1000 and 2100
    ),

  constraint brewery_relations_type_check
    check (
      relation_type in (
        'continues_as',
        'branches_into',
        'merges_into',
        'related_to'
      )
    ),

  constraint brewery_relations_unique
    unique (
      from_brewery_id,
      to_brewery_id,
      relation_type,
      relation_year
    )
);

create index if not exists
  brewery_relations_from_brewery_idx
on public.brewery_relations (
  from_brewery_id
);

create index if not exists
  brewery_relations_to_brewery_idx
on public.brewery_relations (
  to_brewery_id
);

alter table public.brewery_relations
enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brewery_relations'
      and policyname =
        'Authenticated users can manage brewery relations'
  ) then
    create policy
      "Authenticated users can manage brewery relations"
    on public.brewery_relations
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end
$$;
