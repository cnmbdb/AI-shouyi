create policy "Admins can read site media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-media'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
