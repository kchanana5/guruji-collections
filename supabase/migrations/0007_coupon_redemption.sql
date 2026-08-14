-- Atomically record a coupon redemption only when an order is successfully confirmed.
-- Returns false when the coupon is inactive, expired, or already at its usage limit.
create or replace function public.increment_coupon_usage(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.coupons
  set usage_count = usage_count + 1
  where upper(code) = upper(trim(p_code))
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and (usage_limit is null or usage_count < usage_limit)
  returning 1 into updated_count;

  return updated_count = 1;
end;
$$;

revoke all on function public.increment_coupon_usage(text) from public;
grant execute on function public.increment_coupon_usage(text) to service_role;
