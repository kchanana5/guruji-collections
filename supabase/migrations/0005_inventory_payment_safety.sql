-- Atomically deduct inventory when an order becomes paid.
-- The row locks and all-or-nothing transaction prevent two paid orders
-- from consuming the same stock.
create or replace function public.deduct_order_inventory(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  current_order_status public.order_status;
  available integer;
begin
  select status into current_order_status
  from public.orders
  where id = p_order_id
  for update;

  if current_order_status is null then
    raise exception 'Order not found';
  end if;

  -- Idempotent: a webhook and browser verification may both call this.
  if current_order_status in ('confirmed','processing','shipped','delivered') then
    return true;
  end if;

  for item in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id
      and variant_id is not null
  loop
    select stock_quantity into available
    from public.product_variants
    where id = item.variant_id
      and is_active = true
    for update;

    if available is null or available < item.quantity then
      raise exception 'Insufficient stock for variant %', item.variant_id;
    end if;

    update public.product_variants
    set stock_quantity = stock_quantity - item.quantity,
        updated_at = now()
    where id = item.variant_id;
  end loop;

  update public.orders
  set status = 'confirmed', updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.deduct_order_inventory(uuid) from public;
grant execute on function public.deduct_order_inventory(uuid) to service_role;
