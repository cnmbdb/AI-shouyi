alter table public.blog_posts
  add column if not exists content text not null default '';

drop policy if exists blog_posts_select_admin on public.blog_posts;
create policy blog_posts_select_admin on public.blog_posts
for select to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists blog_posts_insert_admin on public.blog_posts;
create policy blog_posts_insert_admin on public.blog_posts
for insert to authenticated
with check ((select private.current_user_is_admin()));

drop policy if exists blog_posts_update_admin on public.blog_posts;
create policy blog_posts_update_admin on public.blog_posts
for update to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

drop policy if exists blog_posts_delete_admin on public.blog_posts;
create policy blog_posts_delete_admin on public.blog_posts
for delete to authenticated
using ((select private.current_user_is_admin()));

grant select, insert, update, delete on public.blog_posts to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_settings'
  ) then
    alter publication supabase_realtime add table public.site_settings;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'blog_posts'
  ) then
    alter publication supabase_realtime add table public.blog_posts;
  end if;
end
$$;

comment on column public.blog_posts.content is
  'Plain-text article body published by the administrator CMS.';
