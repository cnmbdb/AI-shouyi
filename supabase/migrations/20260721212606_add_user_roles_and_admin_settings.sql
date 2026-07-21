alter table public.profiles
  add column role text not null default 'user';

alter table public.profiles
  add constraint profiles_role_valid
  check (role in ('admin', 'user'));

comment on column public.profiles.role is
  'Authoritative application role. Only trusted server code may change this value.';

with bootstrap_admin as (
  select id
  from auth.users
  order by created_at asc
  limit 1
)
update public.profiles as profile
set role = 'admin'
from bootstrap_admin
where profile.id = bootstrap_admin.id;

create function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.current_user_is_admin() from public, anon;
grant execute on function private.current_user_is_admin() to authenticated;

drop policy site_settings_select_own on public.site_settings;
drop policy site_settings_insert_own on public.site_settings;
drop policy site_settings_update_own on public.site_settings;
drop policy site_settings_delete_own on public.site_settings;

create policy site_settings_select_admin on public.site_settings
for select to authenticated
using (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);

create policy site_settings_insert_admin on public.site_settings
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);

create policy site_settings_update_admin on public.site_settings
for update to authenticated
using (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
)
with check (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);

create policy site_settings_delete_admin on public.site_settings
for delete to authenticated
using (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);
