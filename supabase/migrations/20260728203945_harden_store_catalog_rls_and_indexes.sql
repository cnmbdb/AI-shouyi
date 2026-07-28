drop policy if exists store_categories_public_read on public.store_categories;
drop policy if exists store_categories_admin_read on public.store_categories;

create policy store_categories_anon_read on public.store_categories
for select to anon
using (enabled);

create policy store_categories_authenticated_read on public.store_categories
for select to authenticated
using (enabled or (select private.current_user_is_admin()));

drop policy if exists store_products_public_read on public.store_products;
drop policy if exists store_products_admin_read on public.store_products;

create policy store_products_anon_read on public.store_products
for select to anon
using (enabled);

create policy store_products_authenticated_read on public.store_products
for select to authenticated
using (enabled or (select private.current_user_is_admin()));

create policy payment_channels_deny_browser_access on public.payment_channels
as restrictive
for all to anon, authenticated
using (false)
with check (false);

create index if not exists store_products_category_id_idx
on public.store_products (category_id);

create index if not exists store_orders_product_id_idx
on public.store_orders (product_id);

create index if not exists store_orders_parent_order_id_idx
on public.store_orders (parent_order_id)
where parent_order_id is not null;
