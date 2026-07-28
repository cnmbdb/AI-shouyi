insert into public.store_categories (
  id,
  name,
  slug,
  description,
  enabled,
  sort_order
)
values
  (
    'category-consumer',
    '桌面级 GPU',
    'desktop-gpu',
    '适合个人开发、渲染与轻量模型推理',
    true,
    10
  ),
  (
    'category-enterprise',
    '企业级 GPU',
    'enterprise-gpu',
    '适合训练、推理集群与长期跑算',
    true,
    20
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

insert into public.store_products (
  id,
  category_id,
  slug,
  share_token,
  sku,
  name,
  summary,
  image_url,
  image_position,
  gpu_model,
  vram,
  hosting_term,
  billing_type,
  rental_price,
  rental_period_unit,
  rental_period_count,
  renewable,
  renewal_price,
  buyout_price,
  inventory,
  details,
  specs,
  enabled,
  sort_order
)
values
  (
    'commerce-rtx-5090',
    'category-consumer',
    'rtx-5090-compute-plan',
    'rtx5090',
    'GPU-RTX5090-24M',
    'RTX 5090 跑算计划',
    '旗舰桌面级 GPU，适合高性能推理、创作和持续跑算。',
    '/images/estate-luna-ridge.png',
    '50% 50%',
    'NVIDIA GeForce RTX 5090',
    '32 GB',
    '24 个月',
    'both',
    6880,
    'month',
    1,
    true,
    6880,
    128800,
    18,
    '设备上架后由平台机房统一托管、运维和调度。租用到期前可按当前续费价续期；买断后设备所有权归购买人，托管服务按订单约定执行。',
    '[
      {"id":"spec-5090-gpu","name":"GPU","value":"NVIDIA GeForce RTX 5090"},
      {"id":"spec-5090-vram","name":"显存","value":"32 GB GDDR7"},
      {"id":"spec-5090-power","name":"功耗","value":"575 W"}
    ]'::jsonb,
    true,
    10
  ),
  (
    'commerce-h100',
    'category-enterprise',
    'h100-sxm-enterprise',
    'h100sxm',
    'GPU-H100-24M',
    'H100 SXM 企业跑算计划',
    '面向大模型训练和高吞吐推理的企业级算力设备。',
    '/images/estate-coast.png',
    '50% 50%',
    'NVIDIA H100 SXM',
    '80 GB',
    '24 个月',
    'rental',
    26800,
    'month',
    1,
    true,
    26800,
    268000,
    6,
    '企业级独享设备，提供上架验收、运行监控、故障处理和收益结算。续费订单会关联原租用订单并延长服务到期时间。',
    '[
      {"id":"spec-h100-gpu","name":"GPU","value":"NVIDIA H100 SXM"},
      {"id":"spec-h100-vram","name":"显存","value":"80 GB HBM3"},
      {"id":"spec-h100-bw","name":"显存带宽","value":"3.35 TB/s"}
    ]'::jsonb,
    true,
    20
  ),
  (
    'commerce-l40s',
    'category-enterprise',
    'l40s-buyout',
    'l40sbuyout',
    'GPU-L40S-BUYOUT',
    'L40S 算力设备',
    '适合图形、视频、生成式 AI 和推理业务的一次性买断设备。',
    '/images/estate-vista-mare.png',
    '50% 50%',
    'NVIDIA L40S',
    '48 GB',
    '买断',
    'buyout',
    0,
    'month',
    1,
    false,
    0,
    68600,
    24,
    '一次性买断设备。支付完成后生成设备交付单，后续托管、运输或提货方式按订单确认。',
    '[
      {"id":"spec-l40s-gpu","name":"GPU","value":"NVIDIA L40S"},
      {"id":"spec-l40s-vram","name":"显存","value":"48 GB GDDR6"},
      {"id":"spec-l40s-fp32","name":"FP32","value":"91.6 TFLOPS"}
    ]'::jsonb,
    true,
    30
  )
on conflict (id) do update
set
  category_id = excluded.category_id,
  slug = excluded.slug,
  share_token = excluded.share_token,
  sku = excluded.sku,
  name = excluded.name,
  summary = excluded.summary,
  image_url = excluded.image_url,
  image_position = excluded.image_position,
  gpu_model = excluded.gpu_model,
  vram = excluded.vram,
  hosting_term = excluded.hosting_term,
  billing_type = excluded.billing_type,
  rental_price = excluded.rental_price,
  rental_period_unit = excluded.rental_period_unit,
  rental_period_count = excluded.rental_period_count,
  renewable = excluded.renewable,
  renewal_price = excluded.renewal_price,
  buyout_price = excluded.buyout_price,
  inventory = excluded.inventory,
  details = excluded.details,
  specs = excluded.specs,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

update public.site_settings
set value = jsonb_set(
  value,
  '{items}',
  (
    select jsonb_agg(
      case
        when item->>'link' ~* '^https?://(ai\.suxin\.ai|localhost(:[0-9]+)?|127\.0\.0\.1(:[0-9]+)?)(/|$)'
        then jsonb_set(
          item,
          '{link}',
          to_jsonb(
            coalesce(
              nullif(
                regexp_replace(
                  item->>'link',
                  '^https?://(ai\.suxin\.ai|localhost(:[0-9]+)?|127\.0\.0\.1(:[0-9]+)?)',
                  '',
                  'i'
                ),
                ''
              ),
              '/'
            )
          )
        )
        else item
      end
      order by item_index
    )
    from jsonb_array_elements(value->'items') with ordinality as entries(item, item_index)
  )
)
where section_key = 'products'
  and jsonb_typeof(value->'items') = 'array';
