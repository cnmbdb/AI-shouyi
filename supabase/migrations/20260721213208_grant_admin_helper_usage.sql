grant usage on schema private to authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
