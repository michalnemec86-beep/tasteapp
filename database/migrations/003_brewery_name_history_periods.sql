alter table public.brewery_name_history
  add column if not exists from_year integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'brewery_name_history_from_year_check'
      and conrelid = 'public.brewery_name_history'::regclass
  ) then
    alter table public.brewery_name_history
      add constraint brewery_name_history_from_year_check
      check (
        from_year is null
        or from_year between 1000 and 2100
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'brewery_name_history_year_order_check'
      and conrelid = 'public.brewery_name_history'::regclass
  ) then
    alter table public.brewery_name_history
      add constraint brewery_name_history_year_order_check
      check (
        from_year is null
        or changed_year is null
        or changed_year >= from_year
      );
  end if;
end
$$;
