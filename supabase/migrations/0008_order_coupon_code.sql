-- Keep the applied coupon code on the order so successful payment flows
-- can redeem it without trusting client-side state.
alter table public.orders
  add column if not exists coupon_code text;
