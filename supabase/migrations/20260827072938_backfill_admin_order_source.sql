update public.store_orders
set product_snapshot = coalesce(product_snapshot, '{}'::jsonb) || jsonb_build_object(
  'source', 'admin',
  'sourceLabel', '管理员添加'
)
where order_no like 'ADM%'
  and coalesce(product_snapshot->>'source', '') = '';

update public.compute_devices device
set product_snapshot = orders.product_snapshot
from public.store_orders orders
where device.store_order_id = orders.id
  and orders.order_no like 'ADM%'
  and device.product_snapshot is distinct from orders.product_snapshot;
