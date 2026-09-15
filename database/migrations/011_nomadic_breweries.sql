alter table public.breweries
  add column if not exists is_nomadic boolean not null default false;

comment on column public.breweries.is_nomadic is
  'True when the brewery is a nomadic/flying brewery without its own production address; it remains a valid brewery identity for statistics.';
