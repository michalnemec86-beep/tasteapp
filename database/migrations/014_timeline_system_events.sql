alter table public.catalog_events
  alter column beer_id drop not null,
  alter column brewery_id drop not null,
  add column if not exists brand_id bigint references public.brands(id) on delete cascade,
  add column if not exists hop_id bigint references public.hops(id) on delete cascade;

alter table public.catalog_events
  drop constraint if exists catalog_events_event_type_check;

alter table public.catalog_events
  add constraint catalog_events_event_type_check
  check (
    event_type in (
      'beer_created',
      'beer_confirmed',
      'beer_version_created',
      'brand_created',
      'brewery_created',
      'hop_created'
    )
  );

alter table public.catalog_events
  drop constraint if exists catalog_events_entity_check;

alter table public.catalog_events
  add constraint catalog_events_entity_check
  check (
    (
      event_type in ('beer_created', 'beer_confirmed', 'beer_version_created')
      and beer_id is not null
      and brewery_id is not null
    )
    or (
      event_type = 'brand_created'
      and brand_id is not null
    )
    or (
      event_type = 'brewery_created'
      and brewery_id is not null
    )
    or (
      event_type = 'hop_created'
      and hop_id is not null
    )
  );

create index if not exists catalog_events_event_type_idx
  on public.catalog_events (event_type, created_at desc);

create index if not exists catalog_events_brand_id_idx
  on public.catalog_events (brand_id)
  where brand_id is not null;

create index if not exists catalog_events_hop_id_idx
  on public.catalog_events (hop_id)
  where hop_id is not null;
