revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create index if not exists earnings_device_id_idx
  on public.earnings (device_id);
