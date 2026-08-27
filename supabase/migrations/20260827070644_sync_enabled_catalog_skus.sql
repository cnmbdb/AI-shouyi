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

