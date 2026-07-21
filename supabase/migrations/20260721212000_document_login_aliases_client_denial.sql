create policy login_aliases_no_client_access
  on public.login_aliases
  for all
  to anon, authenticated
  using (false)
  with check (false);
