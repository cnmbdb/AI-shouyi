-- Site settings are global published content. Keep the most recently edited
-- row for each section before changing the primary key from per-user to global.
create temporary table latest_site_settings on commit drop as
select distinct on (section_key)
  user_id,
  section_key,
  value,
  updated_at
from public.site_settings
order by section_key, updated_at desc;

delete from public.site_settings;

alter table public.site_settings
  drop constraint site_settings_pkey;

insert into public.site_settings (user_id, section_key, value, updated_at)
select user_id, section_key, value, updated_at
from latest_site_settings;

alter table public.site_settings
  add primary key (section_key);

alter table public.site_settings
  drop constraint site_settings_value_size;

alter table public.site_settings
  add constraint site_settings_value_size
  check (octet_length(value::text) <= 131072);

drop policy site_settings_select_admin on public.site_settings;
drop policy site_settings_insert_admin on public.site_settings;
drop policy site_settings_update_admin on public.site_settings;
drop policy site_settings_delete_admin on public.site_settings;

create policy site_settings_public_read on public.site_settings
for select to anon, authenticated
using (true);

create policy site_settings_insert_admin on public.site_settings
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);

create policy site_settings_update_admin on public.site_settings
for update to authenticated
using ((select private.current_user_is_admin()))
with check (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);

create policy site_settings_delete_admin on public.site_settings
for delete to authenticated
using ((select private.current_user_is_admin()));

grant select on public.site_settings to anon;
grant select, insert, update, delete on public.site_settings to authenticated;

comment on table public.site_settings is
  'Global published site configuration. Publicly readable and writable only by administrators.';
