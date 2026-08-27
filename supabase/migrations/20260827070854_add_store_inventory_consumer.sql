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
