-- GJC product image storage
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

create policy "public can read GJC product images"
on storage.objects
for select
using (bucket_id = 'product-images');

create policy "GJC admins can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and private.is_admin());

create policy "GJC admins can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and private.is_admin())
with check (bucket_id = 'product-images' and private.is_admin());

create policy "GJC admins can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and private.is_admin());
