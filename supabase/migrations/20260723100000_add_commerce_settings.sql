create table public.commerce_settings (
  section_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint commerce_settings_section_key check (section_key in ('products', 'payment')),
  constraint commerce_settings_value_size check (octet_length(value::text) <= 131072)
);

alter table public.commerce_settings enable row level security;

create policy commerce_settings_select_admin on public.commerce_settings
for select to authenticated
using ((select private.current_user_is_admin()));

create policy commerce_settings_insert_admin on public.commerce_settings
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);

create policy commerce_settings_update_admin on public.commerce_settings
for update to authenticated
using ((select private.current_user_is_admin()))
with check (
  (select auth.uid()) = user_id
  and (select private.current_user_is_admin())
);

create policy commerce_settings_delete_admin on public.commerce_settings
for delete to authenticated
using ((select private.current_user_is_admin()));

grant select, insert, update, delete on public.commerce_settings to authenticated;

create trigger commerce_settings_set_updated_at before update on public.commerce_settings
for each row execute function private.set_updated_at();

comment on table public.commerce_settings is
  'Private administrator-only commerce catalog and payment configuration.';
