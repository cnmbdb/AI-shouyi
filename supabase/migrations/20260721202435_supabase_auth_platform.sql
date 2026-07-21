create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  display_name text not null,
  avatar_color text not null default '#525252',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_length check (char_length(btrim(username)) between 2 and 32),
  constraint profiles_username_format check (username !~ '[[:space:]@/]'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 80)
);

create table public.login_aliases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username_normalized text not null unique,
  email_normalized text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.site_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, section_key),
  constraint site_settings_section_key check (section_key in ('navigation', 'footer', 'home', 'products', 'blog')),
  constraint site_settings_value_size check (octet_length(value::text) <= 16384)
);

create table public.compute_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_code text not null,
  name text not null,
  compute text not null,
  status text not null,
  daily_yield numeric(12, 2) not null default 0,
  expires_at date,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, device_code)
);

create table public.rental_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_no text not null,
  product text not null,
  period_months integer not null,
  amount numeric(14, 2) not null,
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, order_no),
  constraint rental_orders_period_positive check (period_months > 0),
  constraint rental_orders_amount_nonnegative check (amount >= 0)
);

create table public.earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.compute_devices(id) on delete set null,
  amount numeric(12, 2) not null,
  earned_on date not null,
  status text not null default '已结算',
  created_at timestamptz not null default timezone('utc', now()),
  constraint earnings_amount_nonnegative check (amount >= 0)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,
  reference text not null,
  amount numeric(14, 2) not null,
  status text not null,
  occurred_at timestamptz not null default timezone('utc', now())
);

create table public.blog_posts (
  slug text primary key,
  title text not null,
  excerpt text not null,
  category text not null,
  author_name text not null,
  author_avatar text,
  image_url text not null,
  image_position text not null default 'center',
  published_at date not null,
  read_time_minutes integer not null default 5,
  featured boolean not null default false,
  editors_pick boolean not null default false,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blog_read_time_positive check (read_time_minutes > 0)
);

create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'blog',
  created_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_email_length check (char_length(email) between 3 and 254),
  constraint newsletter_email_format check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create unique index newsletter_email_normalized_idx on public.newsletter_subscriptions (lower(btrim(email)));
create index compute_devices_user_id_idx on public.compute_devices (user_id);
create index rental_orders_user_id_idx on public.rental_orders (user_id);
create index earnings_user_date_idx on public.earnings (user_id, earned_on desc);
create index transactions_user_date_idx on public.transactions (user_id, occurred_at desc);
create index blog_posts_published_order_idx on public.blog_posts (published, display_order, published_at desc);

alter table public.profiles enable row level security;
alter table public.login_aliases enable row level security;
alter table public.site_settings enable row level security;
alter table public.compute_devices enable row level security;
alter table public.rental_orders enable row level security;
alter table public.earnings enable row level security;
alter table public.transactions enable row level security;
alter table public.blog_posts enable row level security;
alter table public.newsletter_subscriptions enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy site_settings_select_own on public.site_settings for select to authenticated
using ((select auth.uid()) = user_id);
create policy site_settings_insert_own on public.site_settings for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy site_settings_update_own on public.site_settings for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy site_settings_delete_own on public.site_settings for delete to authenticated
using ((select auth.uid()) = user_id);

create policy compute_devices_select_own on public.compute_devices for select to authenticated
using ((select auth.uid()) = user_id);
create policy rental_orders_select_own on public.rental_orders for select to authenticated
using ((select auth.uid()) = user_id);
create policy earnings_select_own on public.earnings for select to authenticated
using ((select auth.uid()) = user_id);
create policy transactions_select_own on public.transactions for select to authenticated
using ((select auth.uid()) = user_id);
create policy blog_posts_select_published on public.blog_posts for select to anon, authenticated
using (published = true);
create policy newsletter_insert_public on public.newsletter_subscriptions for insert to anon, authenticated
with check (
  char_length(email) between 3 and 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
);

revoke all on public.profiles from anon, authenticated;
revoke all on public.login_aliases from anon, authenticated;
revoke all on public.site_settings from anon, authenticated;
revoke all on public.compute_devices from anon, authenticated;
revoke all on public.rental_orders from anon, authenticated;
revoke all on public.earnings from anon, authenticated;
revoke all on public.transactions from anon, authenticated;
revoke all on public.blog_posts from anon, authenticated;
revoke all on public.newsletter_subscriptions from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_color) on public.profiles to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select on public.compute_devices, public.rental_orders, public.earnings, public.transactions to authenticated;
grant select on public.blog_posts to anon, authenticated;
grant insert on public.newsletter_subscriptions to anon, authenticated;
grant select on public.login_aliases to service_role;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute function private.set_updated_at();
create trigger blog_posts_set_updated_at before update on public.blog_posts
for each row execute function private.set_updated_at();

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := btrim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_username_normalized text;
begin
  if char_length(v_username) < 2 or char_length(v_username) > 32 or v_username ~ '[[:space:]@/]' then
    raise exception 'invalid username';
  end if;
  if new.email is null or char_length(new.email) < 3 then
    raise exception 'email is required';
  end if;

  v_username_normalized := lower(v_username);

  insert into public.profiles (id, username, username_normalized, display_name, avatar_color)
  values (
    new.id,
    v_username,
    v_username_normalized,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), v_username),
    '#525252'
  );

  insert into public.login_aliases (user_id, username_normalized, email_normalized)
  values (new.id, v_username_normalized, lower(btrim(new.email)));

  insert into public.site_settings (user_id, section_key, value)
  values
    (new.id, 'navigation', '{"siteName":"Aether Lane","ctaText":"租用算力","ctaLink":"/estates","sticky":true,"showBlog":true}'::jsonb),
    (new.id, 'footer', '{"description":"稳定的算力托管，透明的收益管理。","email":"hello@aetherlane.com","phone":"+86 400 800 2026","copyright":"© 2026 Aether Lane"}'::jsonb),
    (new.id, 'home', '{"title":"Galaxy Compute","subtitle":"让算力成为持续运行的数字资产","primaryAction":"浏览算力设备","secondaryAction":"了解托管收益","showStats":true}'::jsonb),
    (new.id, 'products', '{"title":"选择适合你的算力","subtitle":"按算力、周期和预期产出进行对比","defaultSort":"recommended","showAvailability":true,"showEstimatedYield":true}'::jsonb),
    (new.id, 'blog', '{"title":"算力与收益洞察","subtitle":"了解设备、能效、托管和行业趋势","featuredLabel":"精选","newsletterTitle":"订阅算力周报","showNewsletter":true}'::jsonb);

  insert into public.compute_devices (user_id, device_code, name, compute, status, daily_yield, expires_at)
  values
    (new.id, 'A100-0427', 'NVIDIA A100 80G', '312 TFLOPS', '运行中', 96.84, current_date + 240),
    (new.id, 'H800-0186', 'NVIDIA H800 80G', '756 TFLOPS', '运行中', 188.26, current_date + 345),
    (new.id, '4090-1108', 'GeForce RTX 4090', '82.6 TFLOPS', '维护中', 28.12, current_date + 128),
    (new.id, 'L40S-0631', 'NVIDIA L40S 48G', '362 TFLOPS', '运行中', 116.70, current_date + 198);

  insert into public.rental_orders (user_id, order_no, product, period_months, amount, status, created_at)
  values
    (new.id, 'CO202607180086', 'NVIDIA H800 80G', 12, 128800, '已完成', timezone('utc', now()) - interval '4 days'),
    (new.id, 'CO202606020041', 'NVIDIA L40S 48G', 12, 68600, '已完成', timezone('utc', now()) - interval '50 days'),
    (new.id, 'CO202603180019', 'NVIDIA A100 80G', 12, 96800, '已完成', timezone('utc', now()) - interval '126 days');

  insert into public.earnings (user_id, amount, earned_on, status)
  select new.id, item.amount, current_date - ((item.day_offset - 1)::integer), '已结算'
  from unnest(array[328.40, 364.20, 341.80, 426.10, 462.70, 448.90, 532.60, 574.30, 548.10, 618.50, 636.80, 684.20, 668.40, 742.60]::numeric[])
    with ordinality as item(amount, day_offset);

  insert into public.transactions (user_id, transaction_type, reference, amount, status, occurred_at)
  values
    (new.id, '托管收益', 'H800-0186', 188.26, '已入账', timezone('utc', now()) - interval '18 minutes'),
    (new.id, '托管收益', 'L40S-0631', 116.70, '已入账', timezone('utc', now()) - interval '20 minutes'),
    (new.id, '周度结算', 'SET-0721', 2036.40, '已结算', timezone('utc', now()) - interval '1 day'),
    (new.id, '设备租用', 'CO202607180086', -128800.00, '已完成', timezone('utc', now()) - interval '4 days');

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
grant execute on function private.handle_new_auth_user() to supabase_auth_admin;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_auth_user();
