-- Link paid commerce orders to the compute assets users actually own.
alter table public.compute_devices
  add column if not exists store_order_id uuid references public.store_orders(id) on delete restrict,
  add column if not exists product_id text references public.store_products(id) on delete set null,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists unit_index integer;

create unique index if not exists compute_devices_store_order_unit_unique_idx
on public.compute_devices (store_order_id, unit_index);

create index if not exists compute_devices_product_id_idx
on public.compute_devices (product_id)
where product_id is not null;

comment on column public.compute_devices.store_order_id is 'Original paid rental or buyout order that created this asset.';
comment on column public.compute_devices.product_snapshot is 'Immutable product and selected SKU snapshot copied from the purchase order.';

alter table public.store_orders
  add column if not exists device_id uuid references public.compute_devices(id) on delete restrict;

create index if not exists store_orders_device_id_idx
on public.store_orders (device_id)
where device_id is not null;

comment on column public.store_orders.device_id is 'For a per-device renewal, identifies the exact asset whose expiry is extended.';

-- Existing paid purchases become visible device assets without touching legacy manually-added devices.
insert into public.compute_devices (
  user_id, device_code, name, compute, status, daily_yield, expires_at,
  store_order_id, product_id, product_snapshot, unit_index
)
select
  orders.user_id,
  orders.order_no || '-' || lpad(units.unit_index::text, 2, '0'),
  coalesce(nullif(orders.product_snapshot->>'gpuModel', ''), nullif(orders.product_snapshot->>'name', ''), 'GPU 算力设备'),
  coalesce(
    (select option->>'value' from jsonb_array_elements(coalesce(orders.product_snapshot->'specification', '[]'::jsonb)) option where option->>'field' = 'computePower' limit 1),
    nullif(orders.product_snapshot->>'vram', ''),
    '待配置'
  ),
  case when orders.service_expires_at is not null and orders.service_expires_at < timezone('utc', now()) then '已到期' else '运行中' end,
  round(
    coalesce(nullif(orders.product_snapshot->>'monthlyRentalPrice', '')::numeric, orders.unit_price, 0)
    * coalesce((select nullif(option->>'value', '')::numeric from jsonb_array_elements(coalesce(orders.product_snapshot->'specification', '[]'::jsonb)) option where option->>'field' = 'monthlyReturnRate' limit 1), 0)
    / 100 / 30,
    2
  ),
  orders.service_expires_at::date,
  orders.id,
  orders.product_id,
  orders.product_snapshot,
  units.unit_index
from public.store_orders orders
cross join lateral generate_series(1, greatest(1, orders.quantity)) as units(unit_index)
where orders.order_type in ('rental', 'buyout')
  and orders.status in ('paid', 'processing', 'completed')
on conflict (store_order_id, unit_index) do nothing;

-- Wallet recharge records stay separate from immutable product orders.
create table if not exists public.wallet_recharges (
  id uuid primary key default gen_random_uuid(),
  recharge_no text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(14, 2) not null,
  fee_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null,
  currency text not null default 'CNY',
  status text not null default 'pending_payment',
  paid_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wallet_recharges_amount_positive check (amount > 0 and fee_amount >= 0 and total_amount >= amount),
  constraint wallet_recharges_status check (status in ('pending_payment', 'paid', 'expired', 'cancelled', 'refunded'))
);

create table if not exists public.wallet_payments (
  id uuid primary key default gen_random_uuid(),
  payment_no text not null unique,
  recharge_id uuid not null references public.wallet_recharges(id) on delete restrict,
  channel_id text not null references public.payment_channels(id) on delete restrict,
  amount numeric(14, 2) not null,
  currency text not null default 'CNY',
  status text not null default 'pending',
  interaction_mode text not null,
  provider_trade_no text,
  checkout_payload jsonb not null default '{}'::jsonb,
  callback_payload jsonb not null default '{}'::jsonb,
  callback_received_at timestamptz,
  paid_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint wallet_payments_amount_positive check (amount > 0),
  constraint wallet_payments_status check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'))
);

create index if not exists wallet_recharges_user_created_idx on public.wallet_recharges (user_id, created_at desc);
create index if not exists wallet_payments_recharge_idx on public.wallet_payments (recharge_id);

alter table public.wallet_recharges enable row level security;
alter table public.wallet_payments enable row level security;
revoke all on public.wallet_recharges, public.wallet_payments from anon, authenticated;
grant select on public.wallet_recharges, public.wallet_payments to authenticated;
grant all on public.wallet_recharges, public.wallet_payments to service_role;

drop policy if exists wallet_recharges_select_own on public.wallet_recharges;
create policy wallet_recharges_select_own on public.wallet_recharges for select to authenticated
using ((select auth.uid()) = user_id or (select private.current_user_is_admin()));

drop policy if exists wallet_payments_select_own on public.wallet_payments;
create policy wallet_payments_select_own on public.wallet_payments for select to authenticated
using (exists (
  select 1 from public.wallet_recharges
  where wallet_recharges.id = wallet_payments.recharge_id
    and (wallet_recharges.user_id = (select auth.uid()) or (select private.current_user_is_admin()))
));

create or replace function public.complete_wallet_recharge(
  p_payment_no text,
  p_provider_trade_no text,
  p_callback_payload jsonb default '{}'::jsonb
)
returns table (recharge_id uuid, recharge_no text, recharge_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.wallet_payments%rowtype;
  v_recharge public.wallet_recharges%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  select * into v_payment from public.wallet_payments where payment_no = p_payment_no for update;
  if not found then raise exception 'wallet_payment_not_found'; end if;
  select * into v_recharge from public.wallet_recharges where id = v_payment.recharge_id for update;
  if not found then raise exception 'wallet_recharge_not_found'; end if;

  if v_payment.status = 'paid' then
    return query select v_recharge.id, v_recharge.recharge_no, v_recharge.status;
    return;
  end if;
  if v_payment.status <> 'pending' or v_recharge.status <> 'pending_payment' then
    raise exception 'wallet_payment_status_invalid';
  end if;

  update public.wallet_payments
  set status = 'paid', provider_trade_no = coalesce(nullif(p_provider_trade_no, ''), provider_trade_no),
      callback_payload = coalesce(p_callback_payload, '{}'::jsonb), callback_received_at = v_now, paid_at = v_now
  where id = v_payment.id;
  update public.wallet_recharges set status = 'paid', paid_at = v_now, updated_at = v_now where id = v_recharge.id returning * into v_recharge;
  insert into public.transactions (user_id, transaction_type, reference, amount, status, occurred_at)
  values (v_recharge.user_id, '账户充值', v_recharge.recharge_no, v_recharge.amount, '已入账', v_now);

  return query select v_recharge.id, v_recharge.recharge_no, v_recharge.status;
end;
$$;

revoke all on function public.complete_wallet_recharge(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_wallet_recharge(text, text, jsonb) to service_role;

-- Keep device assets synchronized when a commerce payment completes.
create or replace function public.complete_store_payment(
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
  v_parent_quantity integer;
begin
  select * into v_payment from public.store_payments where payment_no = p_payment_no for update;
  if not found then raise exception 'payment_not_found'; end if;
  select * into v_order from public.store_orders where id = v_payment.order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_payment.status = 'paid' then return query select v_order.id, v_order.order_no, v_order.order_type, v_order.status; return; end if;
  if v_payment.status <> 'pending' or v_order.status <> 'pending_payment' then raise exception 'payment_status_invalid'; end if;

  if v_order.order_type <> 'renewal' then
    perform public.consume_store_product_inventory(v_order.product_id, v_order.product_snapshot->>'skuVariantId', v_order.quantity);
  end if;

  v_start := timezone('utc', now());
  update public.store_payments set status = 'paid', provider_trade_no = coalesce(nullif(p_provider_trade_no, ''), provider_trade_no),
    callback_payload = coalesce(p_callback_payload, '{}'::jsonb), callback_received_at = v_start, paid_at = v_start where id = v_payment.id;

  if v_order.order_type = 'renewal' then
    if v_order.device_id is not null then
      select greatest(coalesce(device.expires_at::timestamptz, parent.service_expires_at, v_start), v_start), parent.quantity
      into v_base_expiry, v_parent_quantity
      from public.store_orders parent
      join public.compute_devices device on device.id = v_order.device_id and device.store_order_id = parent.id
      where parent.id = v_order.parent_order_id
      for update of parent, device;
    else
      select greatest(coalesce(service_expires_at, v_start), v_start), quantity into v_base_expiry, v_parent_quantity
      from public.store_orders where id = v_order.parent_order_id for update;
    end if;
  else
    v_base_expiry := v_start;
  end if;
  if v_order.order_type in ('rental', 'renewal') then
    v_expiry := case v_order.period_unit when 'day' then v_base_expiry + make_interval(days => v_order.period_count)
      when 'year' then v_base_expiry + make_interval(years => v_order.period_count)
      else v_base_expiry + make_interval(months => v_order.period_count) end;
  else v_expiry := null; end if;

  update public.store_orders set status = 'paid', paid_at = v_start,
    service_starts_at = case when v_order.order_type = 'renewal' then v_base_expiry else v_start end,
    service_expires_at = v_expiry where id = v_order.id returning * into v_order;

  if v_order.order_type = 'renewal' then
    if v_order.device_id is not null then
      update public.compute_devices set expires_at = v_expiry::date where id = v_order.device_id and store_order_id = v_order.parent_order_id;
      if v_parent_quantity = 1 then update public.store_orders set service_expires_at = v_expiry where id = v_order.parent_order_id; end if;
    else
      update public.store_orders set service_expires_at = v_expiry where id = v_order.parent_order_id;
      update public.compute_devices set expires_at = v_expiry::date where store_order_id = v_order.parent_order_id;
    end if;
  else
    insert into public.compute_devices (
      user_id, device_code, name, compute, status, daily_yield, expires_at,
      store_order_id, product_id, product_snapshot, unit_index
    )
    select
      v_order.user_id, v_order.order_no || '-' || lpad(unit_no::text, 2, '0'),
      coalesce(nullif(v_order.product_snapshot->>'gpuModel', ''), nullif(v_order.product_snapshot->>'name', ''), 'GPU 算力设备'),
      coalesce((select item->>'value' from jsonb_array_elements(coalesce(v_order.product_snapshot->'specification', '[]'::jsonb)) item where item->>'field' = 'computePower' limit 1), nullif(v_order.product_snapshot->>'vram', ''), '待配置'),
      '运行中',
      round(coalesce(nullif(v_order.product_snapshot->>'monthlyRentalPrice', '')::numeric, v_order.unit_price, 0)
        * coalesce((select nullif(item->>'value', '')::numeric from jsonb_array_elements(coalesce(v_order.product_snapshot->'specification', '[]'::jsonb)) item where item->>'field' = 'monthlyReturnRate' limit 1), 0) / 100 / 30, 2),
      v_expiry::date, v_order.id, v_order.product_id, v_order.product_snapshot, unit_no
    from generate_series(1, greatest(1, v_order.quantity)) unit_no
    on conflict (store_order_id, unit_index) do nothing;
  end if;

  return query select v_order.id, v_order.order_no, v_order.order_type, v_order.status;
end;
$$;

revoke all on function public.complete_store_payment(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_store_payment(text, text, jsonb) to service_role;
