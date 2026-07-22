create table public.store_categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_categories_id_format check (id ~ '^[a-zA-Z0-9_-]{3,80}$'),
  constraint store_categories_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint store_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.store_products (
  id text primary key,
  category_id text references public.store_categories(id) on delete set null,
  slug text not null unique,
  share_token text not null unique,
  sku text not null unique,
  name text not null,
  summary text not null default '',
  image_url text not null default '',
  image_position text not null default 'center center',
  gpu_model text not null default '',
  vram text not null default '',
  hosting_term text not null default '',
  billing_type text not null default 'rental',
  rental_price numeric(14, 2) not null default 0,
  rental_period_unit text not null default 'month',
  rental_period_count integer not null default 1,
  renewable boolean not null default true,
  renewal_price numeric(14, 2) not null default 0,
  buyout_price numeric(14, 2) not null default 0,
  inventory integer not null default 0,
  details text not null default '',
  specs jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_products_id_format check (id ~ '^[a-zA-Z0-9_-]{3,100}$'),
  constraint store_products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint store_products_share_token_format check (share_token ~ '^[a-zA-Z0-9_-]{4,80}$'),
  constraint store_products_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint store_products_billing_type check (billing_type in ('rental', 'buyout', 'both')),
  constraint store_products_period_unit check (rental_period_unit in ('day', 'month', 'year')),
  constraint store_products_prices_nonnegative check (rental_price >= 0 and renewal_price >= 0 and buyout_price >= 0),
  constraint store_products_period_positive check (rental_period_count > 0),
  constraint store_products_inventory_nonnegative check (inventory >= 0),
  constraint store_products_specs_array check (jsonb_typeof(specs) = 'array')
);

create table public.payment_channels (
  id text primary key,
  name text not null,
  icon text not null default '',
  provider_type text not null,
  channel_type text not null,
  interaction_mode text not null,
  fee_rate numeric(7, 4) not null default 0,
  fixed_fee numeric(14, 2) not null default 0,
  min_amount numeric(14, 2) not null default 0,
  max_amount numeric(14, 2) not null default 0,
  hide_amount_out_range boolean not null default false,
  payment_roles jsonb not null default '["member"]'::jsonb,
  payment_types jsonb not null default '["order","renewal"]'::jsonb,
  member_levels jsonb not null default '[]'::jsonb,
  public_config jsonb not null default '{}'::jsonb,
  secret_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_channels_id_format check (id ~ '^[a-zA-Z0-9_-]{3,100}$'),
  constraint payment_channels_provider check (provider_type in ('manual', 'official', 'epay', 'bepusdt', 'epusdt', 'okpay', 'tokenpay')),
  constraint payment_channels_interaction check (interaction_mode in ('qr', 'redirect', 'wap', 'page')),
  constraint payment_channels_fees_nonnegative check (fee_rate >= 0 and fixed_fee >= 0),
  constraint payment_channels_amounts_nonnegative check (min_amount >= 0 and max_amount >= 0),
  constraint payment_channels_amount_range check (max_amount = 0 or max_amount >= min_amount),
  constraint payment_channels_roles_array check (jsonb_typeof(payment_roles) = 'array'),
  constraint payment_channels_types_array check (jsonb_typeof(payment_types) = 'array'),
  constraint payment_channels_member_levels_array check (jsonb_typeof(member_levels) = 'array')
);

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  product_id text not null references public.store_products(id) on delete restrict,
  parent_order_id uuid references public.store_orders(id) on delete restrict,
  order_type text not null,
  product_snapshot jsonb not null,
  quantity integer not null default 1,
  period_unit text,
  period_count integer,
  unit_price numeric(14, 2) not null,
  subtotal numeric(14, 2) not null,
  fee_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null,
  currency text not null default 'CNY',
  status text not null default 'pending_payment',
  service_starts_at timestamptz,
  service_expires_at timestamptz,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 minutes'),
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_orders_type check (order_type in ('rental', 'buyout', 'renewal')),
  constraint store_orders_status check (status in ('pending_payment', 'paid', 'processing', 'completed', 'expired', 'cancelled', 'refunded')),
  constraint store_orders_quantity_positive check (quantity > 0),
  constraint store_orders_amounts_nonnegative check (unit_price >= 0 and subtotal >= 0 and fee_amount >= 0 and total_amount >= 0),
  constraint store_orders_period_positive check (period_count is null or period_count > 0)
);

create table public.store_payments (
  id uuid primary key default gen_random_uuid(),
  payment_no text not null unique,
  order_id uuid not null references public.store_orders(id) on delete restrict,
  channel_id text not null references public.payment_channels(id) on delete restrict,
  provider_trade_no text,
  amount numeric(14, 2) not null,
  currency text not null default 'CNY',
  status text not null default 'pending',
  interaction_mode text not null,
  checkout_payload jsonb not null default '{}'::jsonb,
  callback_payload jsonb not null default '{}'::jsonb,
  callback_received_at timestamptz,
  paid_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_payments_status check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')),
  constraint store_payments_amount_nonnegative check (amount >= 0)
);

create unique index store_payments_provider_trade_no_idx
on public.store_payments (channel_id, provider_trade_no)
where provider_trade_no is not null;
create index store_products_public_order_idx on public.store_products (enabled, sort_order, created_at);
create index store_categories_public_order_idx on public.store_categories (enabled, sort_order, created_at);
create index store_orders_user_created_idx on public.store_orders (user_id, created_at desc);
create index store_payments_order_created_idx on public.store_payments (order_id, created_at desc);

alter table public.store_categories enable row level security;
alter table public.store_products enable row level security;
alter table public.payment_channels enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_payments enable row level security;

create policy store_categories_public_read on public.store_categories
for select to anon, authenticated using (enabled);
create policy store_categories_admin_read on public.store_categories
for select to authenticated using ((select private.current_user_is_admin()));
create policy store_categories_admin_insert on public.store_categories
for insert to authenticated with check ((select private.current_user_is_admin()));
create policy store_categories_admin_update on public.store_categories
for update to authenticated using ((select private.current_user_is_admin())) with check ((select private.current_user_is_admin()));
create policy store_categories_admin_delete on public.store_categories
for delete to authenticated using ((select private.current_user_is_admin()));

create policy store_products_public_read on public.store_products
for select to anon, authenticated using (enabled);
create policy store_products_admin_read on public.store_products
for select to authenticated using ((select private.current_user_is_admin()));
create policy store_products_admin_insert on public.store_products
for insert to authenticated with check ((select private.current_user_is_admin()));
create policy store_products_admin_update on public.store_products
for update to authenticated using ((select private.current_user_is_admin())) with check ((select private.current_user_is_admin()));
create policy store_products_admin_delete on public.store_products
for delete to authenticated using ((select private.current_user_is_admin()));

create policy store_orders_select_own on public.store_orders
for select to authenticated using ((select auth.uid()) = user_id or (select private.current_user_is_admin()));
create policy store_payments_select_own on public.store_payments
for select to authenticated using (exists (
  select 1 from public.store_orders
  where store_orders.id = store_payments.order_id
    and (store_orders.user_id = (select auth.uid()) or (select private.current_user_is_admin()))
));

revoke all on public.store_categories, public.store_products, public.payment_channels, public.store_orders, public.store_payments from anon, authenticated;
grant select on public.store_categories, public.store_products to anon, authenticated;
grant insert, update, delete on public.store_categories, public.store_products to authenticated;
grant select on public.store_orders, public.store_payments to authenticated;
grant all on public.payment_channels, public.store_orders, public.store_payments to service_role;

create trigger store_categories_set_updated_at before update on public.store_categories
for each row execute function private.set_updated_at();
create trigger store_products_set_updated_at before update on public.store_products
for each row execute function private.set_updated_at();
create trigger payment_channels_set_updated_at before update on public.payment_channels
for each row execute function private.set_updated_at();
create trigger store_orders_set_updated_at before update on public.store_orders
for each row execute function private.set_updated_at();
create trigger store_payments_set_updated_at before update on public.store_payments
for each row execute function private.set_updated_at();

comment on table public.payment_channels is 'Private payment-channel configuration. secret_config is accessible only through trusted service code.';
comment on column public.store_orders.parent_order_id is 'Renewal orders reference the original rental or the previous renewal order.';
comment on column public.store_products.renewal_price is 'Current renewal unit price; copied into each renewal order snapshot at creation time.';

create function public.complete_store_payment(
  p_payment_no text,
  p_provider_trade_no text,
  p_callback_payload jsonb default '{}'::jsonb
)
returns table (order_id uuid, order_no text, order_type text, order_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.store_payments%rowtype;
  v_order public.store_orders%rowtype;
  v_start timestamptz;
  v_base_expiry timestamptz;
  v_expiry timestamptz;
begin
  select * into v_payment
  from public.store_payments
  where payment_no = p_payment_no
  for update;
  if not found then raise exception 'payment_not_found'; end if;

  select * into v_order
  from public.store_orders
  where id = v_payment.order_id
  for update;
  if not found then raise exception 'order_not_found'; end if;

  if v_payment.status = 'paid' then
    return query select v_order.id, v_order.order_no, v_order.order_type, v_order.status;
    return;
  end if;
  if v_payment.status <> 'pending' or v_order.status <> 'pending_payment' then
    raise exception 'payment_status_invalid';
  end if;

  if v_order.order_type <> 'renewal' then
    update public.store_products
    set inventory = inventory - v_order.quantity
    where id = v_order.product_id and inventory >= v_order.quantity;
    if not found then raise exception 'inventory_insufficient'; end if;
  end if;

  update public.store_payments
  set status = 'paid',
      provider_trade_no = coalesce(nullif(p_provider_trade_no, ''), provider_trade_no),
      callback_payload = coalesce(p_callback_payload, '{}'::jsonb),
      callback_received_at = timezone('utc', now()),
      paid_at = timezone('utc', now())
  where id = v_payment.id;

  v_start := timezone('utc', now());
  if v_order.order_type = 'renewal' then
    select greatest(coalesce(service_expires_at, v_start), v_start)
    into v_base_expiry
    from public.store_orders
    where id = v_order.parent_order_id
    for update;
  else
    v_base_expiry := v_start;
  end if;

  if v_order.order_type in ('rental', 'renewal') then
    v_expiry := case v_order.period_unit
      when 'day' then v_base_expiry + make_interval(days => v_order.period_count)
      when 'year' then v_base_expiry + make_interval(years => v_order.period_count)
      else v_base_expiry + make_interval(months => v_order.period_count)
    end;
  else
    v_expiry := null;
  end if;

  update public.store_orders
  set status = 'paid',
      paid_at = v_start,
      service_starts_at = case when v_order.order_type = 'renewal' then v_base_expiry else v_start end,
      service_expires_at = v_expiry
  where id = v_order.id
  returning * into v_order;

  if v_order.order_type = 'renewal' then
    update public.store_orders
    set service_expires_at = v_expiry
    where id = v_order.parent_order_id;
  end if;

  return query select v_order.id, v_order.order_no, v_order.order_type, v_order.status;
end;
$$;

revoke all on function public.complete_store_payment(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_store_payment(text, text, jsonb) to service_role;
