-- Commerce products are the single source for calculator, detail, and trusted SKU repricing.
-- Four three-option dimensions produce 81 independently priced SKU rows.
alter table public.store_products drop constraint if exists store_products_specs_array;
alter table public.store_products drop constraint if exists store_products_specs_shape;
alter table public.store_products add constraint store_products_specs_shape check (jsonb_typeof(specs) in ('array', 'object'));

create or replace function pg_temp.build_compute_sku_specs(p_prefix text, p_price numeric, p_inventory integer)
returns jsonb
language sql
as $$
with
  compute_values(value, ord) as (values ('30', 1), ('50', 2), ('100', 3)),
  return_values(value, ord) as (values ('3', 1), ('10', 2), ('40', 3)),
  duration_values(value, ord) as (values ('1', 1), ('30', 2), ('180', 3)),
  token_values(value, ord) as (values ('300', 1), ('500', 2), ('1000', 3)),
  levels as (
    select jsonb_build_array(
      jsonb_build_object('id', p_prefix || '-level-compute', 'field', 'computePower', 'name', '算力', 'unit', '', 'options', (select jsonb_agg(jsonb_build_object('id', p_prefix || '-compute-' || ord, 'value', value) order by ord) from compute_values)),
      jsonb_build_object('id', p_prefix || '-level-return', 'field', 'monthlyReturnRate', 'name', '月租回报', 'unit', '%', 'options', (select jsonb_agg(jsonb_build_object('id', p_prefix || '-return-' || ord, 'value', value) order by ord) from return_values)),
      jsonb_build_object('id', p_prefix || '-level-duration', 'field', 'rentalDuration', 'name', '租赁时长', 'unit', '天', 'options', (select jsonb_agg(jsonb_build_object('id', p_prefix || '-duration-' || ord, 'value', value) order by ord) from duration_values)),
      jsonb_build_object('id', p_prefix || '-level-token', 'field', 'dailyTokenOutput', 'name', '每日 TOKEN 产出', 'unit', 'TOKEN', 'options', (select jsonb_agg(jsonb_build_object('id', p_prefix || '-token-' || ord, 'value', value) order by ord) from token_values))
    ) value
  ),
  variants as (
    select jsonb_agg(
      jsonb_build_object(
        'id', p_prefix || '-sku-' || c.ord || '-' || r.ord || '-' || d.ord || '-' || t.ord,
        'selections', jsonb_build_object(
          p_prefix || '-level-compute', p_prefix || '-compute-' || c.ord,
          p_prefix || '-level-return', p_prefix || '-return-' || r.ord,
          p_prefix || '-level-duration', p_prefix || '-duration-' || d.ord,
          p_prefix || '-level-token', p_prefix || '-token-' || t.ord
        ),
        'price', round(
          coalesce(p_price, 0)
          * greatest(0.6, least(2.1, c.value::numeric / 50))
          * greatest(0.9, least(1.35, 0.9 + r.value::numeric / 100))
          * case when d.value::numeric <= 1 then 1.08 when d.value::numeric <= 30 then 1 else 0.92 end
          * greatest(0.86, least(1.25, 0.84 + t.value::numeric / 2500))
          / 10
        ) * 10,
        'inventory', greatest(0, round(
          coalesce(p_inventory, 0)
          * greatest(0.45, least(1.2, 1.35 - c.value::numeric / 120))
          * greatest(0.8, least(1.05, 1.05 - r.value::numeric / 200))
          * case when d.value::numeric <= 1 then 1.05 when d.value::numeric <= 30 then 1 else 0.95 end
          * greatest(0.75, least(1.05, 1.05 - t.value::numeric / 5000))
        ))::integer
      )
      order by c.ord, r.ord, d.ord, t.ord
    ) value
    from compute_values c
    cross join return_values r
    cross join duration_values d
    cross join token_values t
  )
select jsonb_build_object('levels', levels.value, 'variants', variants.value)
from levels, variants;
$$;

update public.store_products
set specs = pg_temp.build_compute_sku_specs('rtx5090', rental_price, inventory)
where id = 'commerce-rtx-5090'
  and (jsonb_typeof(specs) <> 'object' or not (specs ? 'variants'));

update public.store_products
set specs = pg_temp.build_compute_sku_specs('h100', rental_price, inventory),
    sort_order = 30
where id = 'commerce-h100'
  and (jsonb_typeof(specs) <> 'object' or not (specs ? 'variants'));

insert into public.store_products (
  id, category_id, slug, share_token, sku, name, summary, image_url, image_position,
  gpu_model, vram, hosting_term, billing_type, rental_price, rental_period_unit,
  rental_period_count, renewable, renewal_price, buyout_price, inventory, details,
  specs, enabled, sort_order
) values (
  'commerce-rtx-4090', 'category-consumer', 'rtx-4090-compute-plan', 'rtx4090',
  'GPU-RTX4090-12M', 'RTX 4090 跑算计划',
  '成熟稳定的桌面级 GPU，适合图像生成、模型推理和持续跑算。',
  '/images/estate-vista-mare.png', '50% 50%', 'NVIDIA GeForce RTX 4090', '24 GB',
  '12–24 个月', 'both', 2650, 'day', 1, true, 2650, 32800, 24,
  '设备由平台统一上架、运维和调度，可按选定规格参与跑算，也可一次性买断。订单会保存所选 SKU 和价格快照。',
  pg_temp.build_compute_sku_specs('rtx4090', 2650, 24),
  true, 20
)
on conflict (id) do nothing;

update public.store_products
set enabled = false
where id = 'commerce-l40s'
  and sku = 'GPU-L40S-BUYOUT';

create or replace function public.consume_store_product_inventory(
  p_product_id text,
  p_variant_id text default null,
  p_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.store_products%rowtype;
  v_variant jsonb;
  v_variant_index bigint;
  v_variant_inventory integer;
  v_variants jsonb;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'inventory_quantity_invalid';
  end if;

  select * into v_product
  from public.store_products
  where id = p_product_id
  for update;
  if not found then raise exception 'product_not_found'; end if;

  if nullif(p_variant_id, '') is not null
    and jsonb_typeof(v_product.specs) = 'object'
    and jsonb_typeof(v_product.specs->'variants') = 'array' then
    select item, ord
    into v_variant, v_variant_index
    from jsonb_array_elements(v_product.specs->'variants') with ordinality as entries(item, ord)
    where item->>'id' = p_variant_id
    limit 1;
    if v_variant is null then raise exception 'variant_not_found'; end if;

    v_variant_inventory := coalesce(nullif(v_variant->>'inventory', '')::integer, v_product.inventory);
    if v_variant_inventory < p_quantity then raise exception 'inventory_insufficient'; end if;
    select jsonb_agg(
      case when ord = v_variant_index
        then jsonb_set(item, '{inventory}', to_jsonb(v_variant_inventory - p_quantity), true)
        else item
      end
      order by ord
    )
    into v_variants
    from jsonb_array_elements(v_product.specs->'variants') with ordinality as entries(item, ord);
    update public.store_products
    set specs = jsonb_set(v_product.specs, '{variants}', v_variants, true),
        inventory = greatest(0, v_product.inventory - p_quantity)
    where id = p_product_id;
    return;
  end if;

  update public.store_products
  set inventory = inventory - p_quantity
  where id = p_product_id and inventory >= p_quantity;
  if not found then raise exception 'inventory_insufficient'; end if;
end;
$$;

revoke all on function public.consume_store_product_inventory(text, text, integer) from public, anon, authenticated;
grant execute on function public.consume_store_product_inventory(text, text, integer) to service_role;

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
    perform public.consume_store_product_inventory(
      v_order.product_id,
      v_order.product_snapshot->>'skuVariantId',
      v_order.quantity
    );
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

create unique index if not exists store_products_gpu_model_unique_idx
on public.store_products (lower(btrim(gpu_model)))
where btrim(gpu_model) <> '';
