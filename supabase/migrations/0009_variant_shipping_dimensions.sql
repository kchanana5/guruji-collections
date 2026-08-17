-- Shipping data used by Shiprocket when creating a shipment.
-- Values describe the normally packed item, not the loose garment.
alter table public.product_variants
  add column if not exists package_length_cm numeric(8,2),
  add column if not exists package_breadth_cm numeric(8,2),
  add column if not exists package_height_cm numeric(8,2);

alter table public.product_variants
  add constraint variant_package_length_check check (package_length_cm is null or package_length_cm > 0),
  add constraint variant_package_breadth_check check (package_breadth_cm is null or package_breadth_cm > 0),
  add constraint variant_package_height_check check (package_height_cm is null or package_height_cm > 0);

comment on column public.product_variants.weight_grams is 'Packed shipment weight per unit in grams.';
comment on column public.product_variants.package_length_cm is 'Packed shipment length per unit in cm.';
comment on column public.product_variants.package_breadth_cm is 'Packed shipment breadth per unit in cm.';
comment on column public.product_variants.package_height_cm is 'Packed shipment height per unit in cm.';
