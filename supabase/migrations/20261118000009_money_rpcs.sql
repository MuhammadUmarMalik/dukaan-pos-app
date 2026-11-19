-- Server functions that move money and stock. They are the only way a cashier can write these rows.
-- Each one: checks membership and subscription access, recomputes totals on the server, is idempotent on id
-- (so an offline outbox can safely retry), and writes sale + items + payments + stock + khata in ONE transaction.

create or replace function public.register_device(p_shop uuid, p_device_id uuid, p_name text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_n integer;
begin
  if not (p_shop in (select app.my_shop_ids())) then raise exception 'not a member of this shop' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_shop::text, 1));
  select code into v_code from public.devices where shop_id = p_shop and id = p_device_id;
  if found then return v_code; end if;
  select coalesce(max(n), 0) + 1 into v_n from public.devices where shop_id = p_shop;
  insert into public.devices (id, shop_id, user_id, n, name) values (p_device_id, p_shop, auth.uid(), v_n, p_name)
  returning code into v_code;
  return v_code;
end $$;

-- p = {shop_id, id, bill_no, party_id?, discount?, sold_at?, device_id?, note?,
--      items:[{id?, product_id, variant_id?, qty, unit_price, name?}], payments:[{id?, mode, amount}]}
create or replace function public.record_sale(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_shop uuid := (p ->> 'shop_id')::uuid; v_id uuid := (p ->> 'id')::uuid;
  v_party uuid := nullif(p ->> 'party_id', '')::uuid;
  v_disc bigint := coalesce((p ->> 'discount')::bigint, 0);
  v_sub bigint := 0; v_total bigint; v_paid bigint := 0; v_khata bigint := 0;
  v_can_disc boolean; v_item jsonb; v_pay jsonb; v_prod public.products; v_qty numeric; v_price bigint;
  v_party_row public.parties;
begin
  perform app.require_write(v_shop);
  if v_id is null or jsonb_array_length(coalesce(p -> 'items', '[]')) = 0 then
    raise exception 'A sale needs an id and at least one item' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sales where shop_id = v_shop and id = v_id) then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;
  v_can_disc := app.has_perm(v_shop, 'give_discount');

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := (v_item ->> 'qty')::numeric; v_price := (v_item ->> 'unit_price')::bigint;
    if v_qty <= 0 or v_price < 0 then raise exception 'Invalid quantity or price' using errcode = 'P0001'; end if;
    select * into v_prod from public.products
     where shop_id = v_shop and id = (v_item ->> 'product_id')::uuid and deleted_at is null;
    if not found then raise exception 'Unknown product %', v_item ->> 'product_id' using errcode = 'P0001'; end if;
    if v_price < v_prod.sale_price and not v_can_disc then
      raise exception 'You are not allowed to sell below the listed price' using errcode = '42501';
    end if;
    v_sub := v_sub + round(v_qty * v_price);
  end loop;
  if v_disc > 0 and not v_can_disc then raise exception 'You are not allowed to give discounts' using errcode = '42501'; end if;
  if v_disc > v_sub then raise exception 'Discount is larger than the bill' using errcode = 'P0001'; end if;
  v_total := v_sub - v_disc;

  for v_pay in select * from jsonb_array_elements(coalesce(p -> 'payments', '[]')) loop
    v_paid := v_paid + (v_pay ->> 'amount')::bigint;
    if v_pay ->> 'mode' = 'khata' then v_khata := v_khata + (v_pay ->> 'amount')::bigint; end if;
  end loop;
  if v_paid <> v_total then
    raise exception 'Payments (%) must equal the bill total (%)', v_paid, v_total using errcode = 'P0001';
  end if;
  if v_khata > 0 then
    select * into v_party_row from public.parties where shop_id = v_shop and id = v_party and kind = 'customer' and deleted_at is null;
    if not found then raise exception 'A khata sale needs a customer' using errcode = 'P0001'; end if;
    if v_party_row.credit_limit is not null and v_party_row.balance + v_khata > v_party_row.credit_limit then
      raise exception 'Credit limit exceeded for this customer' using errcode = 'P0001';
    end if;
  end if;

  insert into public.sales (id, shop_id, bill_no, party_id, subtotal, discount, total, sold_at, device_id, note)
  values (v_id, v_shop, p ->> 'bill_no', v_party, v_sub, v_disc, v_total,
          coalesce((p ->> 'sold_at')::timestamptz, now()), p ->> 'device_id', p ->> 'note');

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := (v_item ->> 'qty')::numeric; v_price := (v_item ->> 'unit_price')::bigint;
    select * into v_prod from public.products where shop_id = v_shop and id = (v_item ->> 'product_id')::uuid;
    insert into public.sale_items (id, shop_id, sale_id, product_id, variant_id, name, qty, unit_price, line_total)
    values (coalesce((v_item ->> 'id')::uuid, gen_random_uuid()), v_shop, v_id, v_prod.id,
            nullif(v_item ->> 'variant_id', '')::uuid, coalesce(v_item ->> 'name', v_prod.name), v_qty, v_price, round(v_qty * v_price));
    if v_prod.track_stock then
      insert into public.stock_movements (shop_id, product_id, variant_id, qty, reason, ref_type, ref_id)
      values (v_shop, v_prod.id, nullif(v_item ->> 'variant_id', '')::uuid, -v_qty, 'sale', 'sale', v_id);
    end if;
  end loop;

  for v_pay in select * from jsonb_array_elements(coalesce(p -> 'payments', '[]')) loop
    insert into public.payments (id, shop_id, sale_id, party_id, mode, amount)
    values (coalesce((v_pay ->> 'id')::uuid, gen_random_uuid()), v_shop, v_id,
            case when v_pay ->> 'mode' = 'khata' then v_party end, v_pay ->> 'mode', (v_pay ->> 'amount')::bigint);
  end loop;

  if v_khata > 0 then
    insert into public.ledger_entries (shop_id, party_id, amount, kind, ref_type, ref_id)
    values (v_shop, v_party, v_khata, 'sale', 'sale', v_id);
  end if;
  return jsonb_build_object('id', v_id, 'bill_no', p ->> 'bill_no', 'subtotal', v_sub, 'total', v_total);
end $$;

-- Customer payment ('payment') or extra credit given ('credit'). amount is always positive here.
create or replace function public.record_ledger_entry(
  p_shop uuid, p_id uuid, p_party uuid, p_kind text, p_amount bigint, p_mode text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_party public.parties;
begin
  perform app.require_write(p_shop);
  if p_kind not in ('payment', 'credit') then raise exception 'kind must be payment or credit' using errcode = 'P0001'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive' using errcode = 'P0001'; end if;
  if p_kind = 'credit' and not app.has_perm(p_shop, 'edit_sales') then
    raise exception 'You are not allowed to give credit' using errcode = '42501';
  end if;
  if exists (select 1 from public.ledger_entries where shop_id = p_shop and id = p_id) then
    return jsonb_build_object('id', p_id, 'duplicate', true);
  end if;
  select * into v_party from public.parties where shop_id = p_shop and id = p_party and kind = 'customer' and deleted_at is null;
  if not found then raise exception 'customer not found' using errcode = 'P0001'; end if;
  if p_kind = 'credit' and v_party.credit_limit is not null and v_party.balance + p_amount > v_party.credit_limit then
    raise exception 'Credit limit exceeded for this customer' using errcode = 'P0001';
  end if;
  insert into public.ledger_entries (id, shop_id, party_id, amount, kind, mode, note)
  values (p_id, p_shop, p_party, case p_kind when 'payment' then -p_amount else p_amount end, p_kind, p_mode, p_note);
  return jsonb_build_object('id', p_id, 'balance', v_party.balance + case p_kind when 'payment' then -p_amount else p_amount end);
end $$;

-- p = {shop_id, id, sale_id, refund_mode: cash|khata|exchange, reason?, items:[{sale_item_id, qty}]}
create or replace function public.record_return(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_shop uuid := (p ->> 'shop_id')::uuid; v_id uuid := (p ->> 'id')::uuid; v_sale public.sales;
  v_item jsonb; v_si public.sale_items; v_qty numeric; v_done numeric; v_amt bigint; v_total bigint := 0; v_track boolean;
begin
  perform app.require_write(v_shop);
  if not app.has_perm(v_shop, 'edit_sales') then raise exception 'You are not allowed to take returns' using errcode = '42501'; end if;
  if exists (select 1 from public.returns where shop_id = v_shop and id = v_id) then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;
  select * into v_sale from public.sales where shop_id = v_shop and id = (p ->> 'sale_id')::uuid and status = 'completed';
  if not found then raise exception 'Sale not found or voided' using errcode = 'P0001'; end if;
  if (p ->> 'refund_mode') = 'khata' and v_sale.party_id is null then
    raise exception 'Khata refund needs a customer on the sale' using errcode = 'P0001';
  end if;
  if jsonb_array_length(coalesce(p -> 'items', '[]')) = 0 then raise exception 'Nothing to return' using errcode = 'P0001'; end if;

  insert into public.returns (id, shop_id, sale_id, party_id, refund_mode, total, reason)
  values (v_id, v_shop, v_sale.id, v_sale.party_id, p ->> 'refund_mode', 0, p ->> 'reason');

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := (v_item ->> 'qty')::numeric;
    select * into v_si from public.sale_items where shop_id = v_shop and sale_id = v_sale.id and id = (v_item ->> 'sale_item_id')::uuid;
    if not found or v_qty <= 0 then raise exception 'Invalid return item' using errcode = 'P0001'; end if;
    select coalesce(sum(qty), 0) into v_done from public.return_items where shop_id = v_shop and sale_item_id = v_si.id;
    if v_done + v_qty > v_si.qty then raise exception 'Cannot return more than was sold' using errcode = 'P0001'; end if;
    -- refund the price actually paid: spread any bill discount across the lines
    v_amt := round(v_qty * v_si.unit_price * case when v_sale.subtotal = 0 then 1 else v_sale.total::numeric / v_sale.subtotal end);
    v_total := v_total + v_amt;
    insert into public.return_items (shop_id, return_id, sale_item_id, product_id, qty, amount)
    values (v_shop, v_id, v_si.id, v_si.product_id, v_qty, v_amt);
    select track_stock into v_track from public.products where shop_id = v_shop and id = v_si.product_id;
    if v_track then
      insert into public.stock_movements (shop_id, product_id, variant_id, qty, reason, ref_type, ref_id)
      values (v_shop, v_si.product_id, v_si.variant_id, v_qty, 'return', 'return', v_id);
    end if;
  end loop;

  update public.returns set total = v_total where shop_id = v_shop and id = v_id;
  if (p ->> 'refund_mode') = 'khata' and v_total > 0 then
    insert into public.ledger_entries (shop_id, party_id, amount, kind, ref_type, ref_id, note)
    values (v_shop, v_sale.party_id, -v_total, 'adjust', 'return', v_id, 'Return credit');
  end if;
  return jsonb_build_object('id', v_id, 'total', v_total);
end $$;

-- Cancels a sale: puts stock back and reverses its khata entry. Cash already handed over is settled by hand.
create or replace function public.void_sale(p_shop uuid, p_sale uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_sale public.sales; r record;
begin
  perform app.require_write(p_shop);
  if not app.has_perm(p_shop, 'edit_sales') then raise exception 'You are not allowed to void sales' using errcode = '42501'; end if;
  select * into v_sale from public.sales where shop_id = p_shop and id = p_sale for update;
  if not found then raise exception 'Sale not found' using errcode = 'P0001'; end if;
  if v_sale.status = 'voided' then raise exception 'Sale is already voided' using errcode = 'P0001'; end if;
  if exists (select 1 from public.returns where shop_id = p_shop and sale_id = p_sale) then
    raise exception 'This sale has returns and cannot be voided' using errcode = 'P0001';
  end if;
  update public.sales set status = 'voided',
         note = concat_ws(' | ', note, 'void: ' || coalesce(p_reason, 'no reason given'))
   where shop_id = p_shop and id = p_sale;
  insert into public.stock_movements (shop_id, product_id, variant_id, qty, reason, ref_type, ref_id)
  select si.shop_id, si.product_id, si.variant_id, si.qty, 'return', 'void', p_sale
  from public.sale_items si join public.products pr on pr.shop_id = si.shop_id and pr.id = si.product_id
  where si.shop_id = p_shop and si.sale_id = p_sale and pr.track_stock;
  for r in select id, party_id, amount from public.ledger_entries
           where shop_id = p_shop and ref_type = 'sale' and ref_id = p_sale and kind = 'sale' loop
    insert into public.ledger_entries (shop_id, party_id, amount, kind, ref_type, ref_id, reversed_of, note)
    values (p_shop, r.party_id, -r.amount, 'reversal', 'sale', p_sale, r.id, 'Sale voided');
  end loop;
  return jsonb_build_object('id', p_sale, 'status', 'voided');
end $$;

revoke execute on function public.register_device(uuid, uuid, text), public.record_sale(jsonb),
  public.record_ledger_entry(uuid, uuid, uuid, text, bigint, text, text), public.record_return(jsonb),
  public.void_sale(uuid, uuid, text) from public, anon;
grant execute on function public.register_device(uuid, uuid, text), public.record_sale(jsonb),
  public.record_ledger_entry(uuid, uuid, uuid, text, bigint, text, text), public.record_return(jsonb),
  public.void_sale(uuid, uuid, text) to authenticated;
