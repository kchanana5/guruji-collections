-- Fix coupon RPCs after private-schema hardening.
-- Guest checkout must be able to validate coupons, while redemption is performed
-- server-side with the service role after a confirmed order.

drop function if exists public.validate_coupon(text, numeric);
drop function if exists public.increment_coupon_usage(text);

create function public.validate_coupon(p_code text, p_order_value numeric)
returns table(valid boolean, coupon_id uuid, discount numeric, message text)
language sql
stable
security definer
set search_path = public
as $$
  select
    true,
    c.id,
    case
      when c.percentage_off is not null
        then round((p_order_value * c.percentage_off / 100)::numeric, 2)
      else least(c.fixed_amount, p_order_value)
    end,
    'Coupon applied'
  from public.coupons c
  where upper(c.code) = upper(trim(p_code))
    and c.is_active = true
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
    and p_order_value >= c.min_order_value
    and (c.usage_limit is null or c.usage_count < c.usage_limit)
  limit 1;
$$;

revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated, service_role;

create function public.increment_coupon_usage(p_code text)
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
