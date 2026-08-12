-- GJC Row Level Security policies.

-- Public catalog: customers can see only active products and their public catalog data.
create policy "public can read active products"
on public.products
for select
using (status = 'active');

create policy "public can read categories"
on public.categories
for select
using (true);

create policy "public can read images for active products"
on public.product_images
for select
using (exists (
  select 1 from public.products p
  where p.id = product_images.product_id and p.status = 'active'
));

create policy "public can read active variants"
on public.product_variants
for select
using (is_active and exists (
  select 1 from public.products p
  where p.id = product_variants.product_id and p.status = 'active'
));

-- Profile ownership.
create policy "users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users can read own addresses"
on public.addresses
for select
using (auth.uid() = user_id);

create policy "users can insert own addresses"
on public.addresses
for insert
with check (auth.uid() = user_id);

create policy "users can update own addresses"
on public.addresses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own addresses"
on public.addresses
for delete
using (auth.uid() = user_id);

-- Cart ownership. Guest carts are handled server-side with controlled session tokens.
create policy "users can read own cart"
on public.carts
for select
using (auth.uid() = user_id);

create policy "users can create own cart"
on public.carts
for insert
with check (auth.uid() = user_id);

create policy "users can update own cart"
on public.carts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own cart"
on public.carts
for delete
using (auth.uid() = user_id);

create policy "users can manage own cart items"
on public.cart_items
for all
using (exists (
  select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
));

-- Customer orders and order items are read-only to customers; writes occur through trusted server code.
create policy "users can read own orders"
on public.orders
for select
using (auth.uid() = user_id);

create policy "users can read own order items"
on public.order_items
for select
using (exists (
  select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()
));

create policy "users can read own payments"
on public.payments
for select
using (exists (
  select 1 from public.orders o where o.id = payments.order_id and o.user_id = auth.uid()
));

create policy "users can read own shipments"
on public.shipments
for select
using (exists (
  select 1 from public.orders o where o.id = shipments.order_id and o.user_id = auth.uid()
));

-- Published reviews can be read publicly; users own their review records.
create policy "public can read published reviews"
on public.reviews
for select
using (is_published = true);

create policy "users can manage own reviews"
on public.reviews
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can manage own wishlist"
on public.wishlists
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read own AI jobs"
on public.ai_generation_jobs
for select
using (auth.uid() = user_id);

create policy "users can create own AI jobs"
on public.ai_generation_jobs
for insert
with check (auth.uid() = user_id);

create policy "users can update own AI jobs"
on public.ai_generation_jobs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admin checks are centralized in a helper function.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Admin full-access policies.
create policy "admins manage categories"
on public.categories
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage products"
on public.products
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage product images"
on public.product_images
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage variants"
on public.product_variants
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage orders"
on public.orders
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage order items"
on public.order_items
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage payments"
on public.payments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage shipments"
on public.shipments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage coupons"
on public.coupons
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage reviews"
on public.reviews
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage AI jobs"
on public.ai_generation_jobs
for all
using (public.is_admin())
with check (public.is_admin());
