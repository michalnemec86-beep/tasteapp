-- Repeated delivery of the same manual form submission must not duplicate a tasting.
-- Historical records and legacy clients have NULL; identical beers/dates remain allowed.
alter table public.tastings
  add column if not exists submission_id uuid;

create unique index if not exists tastings_user_submission_id_uniq
  on public.tastings (user_id, submission_id);
