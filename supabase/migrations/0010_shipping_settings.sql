-- Configurable store shipping charge.
-- Default: ₹69 for orders below ₹499; free shipping at ₹499+.
create table if not exists public.store_settings (
  id boolean primary key default true check (id = true),
  shipping_charge numeric(12,2) not null default 69 check (shipping_charge >= 0),
  free_shipping_threshold numeric(12,2) not null default 499 check (free_shipping_threshold >= 0),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id, shipping_charge, free_shipping_threshold)
values (true, 69, 499)
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

create policy "Admins can read store settings"
on public.store_settings for select
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can update store settings"
on public.store_settings for update
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
