-- Admin deletion uses Supabase Auth soft deletion so financial history can be
-- retained. Soft deletion updates auth.users instead of deleting it, therefore
-- ON DELETE CASCADE does not release the username and email aliases by itself.
create or replace function private.cleanup_soft_deleted_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.login_aliases where user_id = new.id;
  delete from public.profiles where id = new.id;
  return new;
end;
$$;

revoke all on function private.cleanup_soft_deleted_auth_identity() from public, anon, authenticated;

drop trigger if exists on_auth_user_soft_deleted on auth.users;
create trigger on_auth_user_soft_deleted
after update of deleted_at on auth.users
for each row
when (old.deleted_at is null and new.deleted_at is not null)
execute function private.cleanup_soft_deleted_auth_identity();

-- Repair identities left behind by soft deletions made before this trigger.
delete from public.login_aliases as alias
using auth.users as auth_user
where alias.user_id = auth_user.id
  and auth_user.deleted_at is not null;

delete from public.profiles as profile
using auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.deleted_at is not null;
