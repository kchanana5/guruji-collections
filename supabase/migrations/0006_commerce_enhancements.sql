-- Commerce enhancements: product ratings summary and safe coupon redemption primitives.
create index if not exists reviews_product_published_idx
  on public.reviews(product_id, is_published);

create or replace function public.product_rating_summary(p_product_id uuid)
returns table(avg_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)
  from public.reviews
  where product_id = p_product_id and is_published = true;
$$;

create or replace function public.validate_coupon(p_code text, p_order_value numeric)
returns table(valid boolean, coupon_id uuid, discount numeric, message text)
language sql
stable
security definer
set search_path = public
as $$
  select
    true,
    c.id,
    case when c.percentage_off is not null
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
