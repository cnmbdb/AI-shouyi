create or replace function public.admin_create_catalog_devices(
  p_admin_id uuid,
  p_user_id uuid,
  p_product_id text,
  p_variant_id text,
  p_quantity integer default 1,
  p_device_status text default '运行中',
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.store_products%rowtype;
  v_variant jsonb;
  v_levels jsonb := '[]'::jsonb;
  v_variants jsonb := '[]'::jsonb;
  v_level jsonb;
  v_option jsonb;
  v_specification jsonb := '[]'::jsonb;
  v_selections jsonb := '{}'::jsonb;
  v_snapshot jsonb;
  v_order public.store_orders%rowtype;
  v_device_ids jsonb;
  v_order_type text;
  v_order_no text;
  v_unit_price numeric(14, 2);
  v_period_days integer;
  v_monthly_return numeric := 0;
  v_compute text;
  v_daily_yield numeric(12, 2);
  v_now timestamptz := timezone('utc', now());
  v_expiry timestamptz;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'admin_required';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id and deleted_at is null) then
    raise exception 'user_not_found';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'quantity_invalid';
  end if;
  if p_device_status not in ('运行中', '已停用', '维护中', '待交付', '已到期') then
    raise exception 'device_status_invalid';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 2 or char_length(btrim(p_reason)) > 500 then
    raise exception 'reason_invalid';
  end if;

  select * into v_product
  from public.store_products
  where id = p_product_id and enabled = true
  for update;
  if not found then raise exception 'product_not_found_or_disabled'; end if;

  if jsonb_typeof(v_product.specs) = 'object' then
    v_levels := coalesce(v_product.specs->'levels', '[]'::jsonb);
    v_variants := coalesce(v_product.specs->'variants', '[]'::jsonb);
  elsif jsonb_typeof(v_product.specs) = 'array' then
    v_levels := v_product.specs;
  end if;

  if jsonb_array_length(v_variants) > 0 then
    select item into v_variant
    from jsonb_array_elements(v_variants) item
    where item->>'id' = p_variant_id
    limit 1;
    if v_variant is null then raise exception 'variant_not_found'; end if;
    v_selections := coalesce(v_variant->'selections', v_variant->'optionIds', '{}'::jsonb);
  else
    v_variant := jsonb_build_object(
      'id', null,
      'selections', '{}'::jsonb,
      'price', v_product.rental_price,
      'inventory', v_product.inventory
    );
  end if;

  for v_level in select value from jsonb_array_elements(v_levels)
  loop
    select option_value into v_option
    from jsonb_array_elements(coalesce(v_level->'options', '[]'::jsonb)) option_value
    where option_value->>'id' = v_selections->>(v_level->>'id')
    limit 1;
    if v_option is not null then
      v_specification := v_specification || jsonb_build_array(jsonb_build_object(
        'levelId', v_level->>'id',
        'field', v_level->>'field',
        'name', v_level->>'name',
        'unit', coalesce(v_level->>'unit', ''),
        'optionId', v_option->>'id',
        'value', coalesce(v_option->>'value', '')
      ));
      if v_level->>'field' = 'rentalDuration' then
        v_period_days := greatest(1, coalesce(nullif(regexp_replace(v_option->>'value', '[^0-9]', '', 'g'), '')::integer, 1));
      elsif v_level->>'field' = 'monthlyReturnRate' then
        v_monthly_return := coalesce(nullif(regexp_replace(v_option->>'value', '[^0-9.]', '', 'g'), '')::numeric, 0);
      elsif v_level->>'field' = 'computePower' then
        v_compute := concat_ws(' ', nullif(v_option->>'value', ''), nullif(v_level->>'unit', ''));
      end if;
    end if;
    v_option := null;
  end loop;

  v_order_type := case when v_product.billing_type = 'buyout' then 'buyout' else 'rental' end;
  v_unit_price := greatest(0, case
    when v_order_type = 'buyout' then v_product.buyout_price
    else coalesce(nullif(v_variant->>'price', '')::numeric, v_product.rental_price)
  end);
  v_period_days := case when v_order_type = 'buyout' then null else greatest(1, coalesce(v_period_days, v_product.rental_period_count, 1)) end;
  v_expiry := case when v_order_type = 'buyout' then null else v_now + make_interval(days => v_period_days) end;
  v_compute := coalesce(nullif(btrim(v_compute), ''), nullif(v_product.vram, ''), '待配置');
  v_daily_yield := round(v_unit_price * greatest(0, v_monthly_return) / 100 / 30, 2);
  v_order_no := 'ADM' || to_char(v_now, 'YYYYMMDDHH24MISS') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  v_snapshot := jsonb_build_object(
    'id', v_product.id,
    'slug', v_product.slug,
    'sku', v_product.sku,
    'name', v_product.name,
    'image', v_product.image_url,
    'gpuModel', v_product.gpu_model,
    'vram', v_product.vram,
    'billingType', v_product.billing_type,
    'specSelections', v_selections,
    'skuVariantId', nullif(v_variant->>'id', ''),
    'skuInventory', coalesce(nullif(v_variant->>'inventory', '')::integer, v_product.inventory),
    'specification', v_specification,
    'monthlyRentalPrice', v_unit_price,
    'source', 'admin',
    'sourceLabel', '管理员添加',
    'adminAddedBy', p_admin_id,
    'adminReason', btrim(p_reason)
  );

  perform public.consume_store_product_inventory(v_product.id, nullif(v_variant->>'id', ''), p_quantity);

  insert into public.store_orders (
    order_no, user_id, product_id, order_type, product_snapshot,
    quantity, period_unit, period_count, unit_price, subtotal,
    fee_amount, total_amount, currency, status, service_starts_at,
    service_expires_at, expires_at, paid_at
  ) values (
    v_order_no, p_user_id, v_product.id, v_order_type, v_snapshot,
    p_quantity, case when v_order_type = 'buyout' then null else 'day' end, v_period_days,
    v_unit_price, v_unit_price * p_quantity, 0, v_unit_price * p_quantity,
    'CNY', 'completed', v_now, v_expiry, v_now + interval '30 minutes', v_now
  ) returning * into v_order;

  with inserted as (
    insert into public.compute_devices (
      user_id, device_code, name, compute, status, daily_yield, expires_at,
      store_order_id, product_id, product_snapshot, unit_index
    )
    select
      p_user_id,
      v_order.order_no || '-' || lpad(unit_no::text, 2, '0'),
      coalesce(nullif(v_product.gpu_model, ''), v_product.name),
      v_compute,
      p_device_status,
      v_daily_yield,
      v_expiry::date,
      v_order.id,
      v_product.id,
      v_snapshot,
      unit_no
    from generate_series(1, p_quantity) unit_no
    returning id
  )
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_device_ids from inserted;

  insert into public.admin_user_audit_logs (
    admin_id, user_id, action, target_kind, target_id,
    before_value, after_value, reason
  ) values (
    p_admin_id, p_user_id, 'create-device-from-catalog', 'device', v_order.id::text,
    null,
    jsonb_build_object('order', to_jsonb(v_order), 'deviceIds', v_device_ids, 'source', '管理员添加'),
    btrim(p_reason)
  );

  return jsonb_build_object(
    'orderId', v_order.id,
    'orderNo', v_order.order_no,
    'deviceIds', v_device_ids,
    'quantity', p_quantity,
    'source', '管理员添加'
  );
end;
$$;

revoke all on function public.admin_create_catalog_devices(uuid, uuid, text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.admin_create_catalog_devices(uuid, uuid, text, text, integer, text, text) to service_role;

comment on function public.admin_create_catalog_devices(uuid, uuid, text, text, integer, text, text)
is 'Atomically creates an administrator-originated completed store order, linked compute devices, inventory consumption, and append-only audit record from a real catalog SKU.';
