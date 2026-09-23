-- Import provenance must not block a user from deleting their own tasting.
-- Keep source/ledger rows, but detach the tasting reference on delete.

alter table private.historical_import_rows
  drop constraint if exists historical_import_rows_tasting_id_fkey;

alter table private.historical_import_rows
  add constraint historical_import_rows_tasting_id_fkey
  foreign key (tasting_id)
  references public.tastings(id)
  on delete set null;

alter table private.import_ledger
  drop constraint if exists import_ledger_tasting_id_fkey;

alter table private.import_ledger
  alter column tasting_id drop not null;

alter table private.import_ledger
  add constraint import_ledger_tasting_id_fkey
  foreign key (tasting_id)
  references public.tastings(id)
  on delete set null;
