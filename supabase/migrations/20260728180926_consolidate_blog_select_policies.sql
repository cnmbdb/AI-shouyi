drop policy if exists blog_posts_select_published on public.blog_posts;
drop policy if exists blog_posts_select_admin on public.blog_posts;

create policy blog_posts_select_published on public.blog_posts
for select to anon
using (published = true);

create policy blog_posts_select_authenticated on public.blog_posts
for select to authenticated
using (
  published = true
  or (select private.current_user_is_admin())
);
