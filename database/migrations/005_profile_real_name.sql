alter table public.profiles
add column if not exists real_name text;

alter table public.profiles
drop constraint if exists profiles_real_name_length_check;

alter table public.profiles
add constraint profiles_real_name_length_check
check (
  real_name is null
  or char_length(btrim(real_name)) between 1 and 60
);

revoke update on table public.profiles
from authenticated;

grant update (real_name)
on table public.profiles
to authenticated;

update public.profiles
set display_name = 'Nachmelený admin'
where id = '17be5dc3-a3f9-4fd2-ae90-dee7692034fc';
