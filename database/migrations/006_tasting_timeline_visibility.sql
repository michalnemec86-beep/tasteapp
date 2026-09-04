alter table public.tastings
add column if not exists show_in_timeline boolean not null default true;
