-- Tenant isolation, roles, money rules, sync and subscriptions. Run with ON_ERROR_STOP; any FAIL aborts.
create schema t;
grant usage on schema t to public;

create function t.ok(c boolean, m text) returns void language plpgsql as $$
begin
  if c is not true then raise exception 'FAIL: %', m; end if;
  raise notice 'ok   %', m;
end $$;
create function t.as_user(u uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
  execute 'set local role authenticated';
end $$;
create function t.as_role(r text) returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claims', '', true); execute format('set local role %I', r); end $$;
create function t.as_super() returns void language plpgsql as $$ begin execute 'reset role'; end $$;

-- statement must raise an error (any code)
create function t.denied(q text, m text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'ok   % (%: %)', m, sqlstate, left(sqlerrm, 70); return; end;
  raise exception 'FAIL: expected an error: %', m;
end $$;
-- statement must raise this exact SQLSTATE
create function t.code(q text, want text, m text) returns void language plpgsql as $$
declare s text; e text;
begin
  begin execute q; exception when others then s := sqlstate; e := sqlerrm; end;
  if s is null then raise exception 'FAIL: expected % but it succeeded: %', want, m; end if;
  if s <> want then raise exception 'FAIL: expected % got % (%): %', want, s, e, m; end if;
  raise notice 'ok   % (%: %)', m, s, left(e, 60);
end $$;
-- statement must succeed but touch zero rows (RLS filtered)
create function t.noop(q text, m text) returns void language plpgsql as $$
declare n bigint;
begin
  execute q; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: % rows changed: %', n, m; end if;
  raise notice 'ok   %', m;
end $$;
create function t.sale(p_shop uuid, p_id uuid, p_bill text, p_party uuid, p_items jsonb, p_pays jsonb, p_disc bigint default 0, p_sold timestamptz default null)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object('shop_id', p_shop, 'id', p_id, 'bill_no', p_bill, 'party_id', p_party,
    'items', p_items, 'payments', p_pays, 'discount', p_disc, 'sold_at', p_sold))
$$;
create function t.item(p_prod uuid, p_qty numeric, p_price bigint) returns jsonb language sql as $$
  select jsonb_build_object('product_id', p_prod, 'qty', p_qty, 'unit_price', p_price)
$$;
create function t.pay(p_mode text, p_amt bigint) returns jsonb language sql as $$
  select jsonb_build_object('mode', p_mode, 'amount', p_amt)
$$;

do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); m uuid := gen_random_uuid();
  d uuid := gen_random_uuid(); adm uuid := gen_random_uuid();
  sa uuid; sb uuid; p1 uuid := gen_random_uuid(); p2 uuid := gen_random_uuid(); cat_a uuid;
  cust uuid := gen_random_uuid(); sup uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); s3 uuid := gen_random_uuid(); s4 uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); led1 uuid := gen_random_uuid(); dev_c uuid := gen_random_uuid(); dev_a uuid := gen_random_uuid();
  seq0 bigint; seq1 bigint; res jsonb; ent jsonb; ok_ boolean; n int; e1 uuid; si1 uuid; t0 timestamptz := now();
begin
  perform t.as_super();
  insert into auth.users (id, email) values (a,'a@x'),(b,'b@x'),(c,'c@x'),(d,'d@x'),(m,'m@x'),(adm,'adm@x');
  insert into public.platform_admins values (adm);

  ---------- shops and membership ----------
  perform t.as_user(a); sa := public.create_shop('Shop A', 'Owner A', 'Lahore', 'bakery');
  perform t.as_user(b); sb := public.create_shop('Shop B', 'Owner B', 'Karachi', 'grocery');
  perform t.as_user(a);
  perform t.ok((select count(*) from public.categories where shop_id = sa) = 5, 'create_shop copied 5 bakery starter categories');
  perform t.ok((select count(*) from public.shops) = 1, 'owner A sees only shop A');
  perform t.denied('insert into public.shops (name) values (''Sneaky'')', 'cannot insert a shop directly');
  perform t.denied(format('update public.shops set setup_until = now() + interval ''99 years'' where id = %L', sa), 'cannot edit setup_until');
  perform t.denied(format('insert into public.memberships (shop_id,user_id,role) values (%L,%L,''owner'')', sa, d), 'cannot add a second owner');
  insert into public.memberships (shop_id, user_id, role) values (sa, c, 'cashier');
  insert into public.memberships (shop_id, user_id, role) values (sa, m, 'manager');
  perform t.ok((select (permissions ->> 'give_discount')::boolean from public.memberships where user_id = c), 'cashier defaults: discounts on');
  perform t.code(format('update public.memberships set permissions = ''{"see_cost":"x"}'' where user_id = %L', c), '23514', 'malformed permissions rejected');
  perform t.as_user(b);
  perform t.ok((select count(*) from public.shops) = 1 and (select count(*) from public.memberships) = 1, 'B sees only shop B and its members');
  perform t.denied(format('insert into public.memberships (shop_id,user_id,role) values (%L,%L,''cashier'')', sa, d), 'B cannot add members to shop A');

  ---------- catalog isolation ----------
  perform t.as_user(a);
  insert into public.products (id, shop_id, name, sale_price) values (p1, sa, 'Bread', 5000), (p2, sa, 'Cake', 90000);
  insert into public.product_costs (shop_id, product_id, cost_price) values (sa, p1, 3500);
  select id into cat_a from public.categories where shop_id = sa limit 1;
  perform t.as_user(b);
  perform t.ok((select count(*) from public.products) = 0, 'B cannot read A products');
  perform t.code(format('insert into public.products (shop_id,name,sale_price) values (%L,''Hack'',1)', sa), '42501', 'B insert into A: plain RLS error, no plan-limit leak');
  perform t.noop(format('update public.products set name = ''x'' where id = %L', p1), 'B cannot update A product');
  perform t.denied(format('delete from public.products where id = %L', p1), 'nobody deletes rows from the app');
  perform t.denied(format('insert into public.products (shop_id,category_id,name,sale_price) values (%L,%L,''X'',1)', sb, cat_a), 'B product cannot point at A category (composite FK)');

  ---------- cashier cannot write money rows directly ----------
  perform t.as_user(c);
  perform t.ok((select count(*) from public.products) = 2, 'cashier can read products');
  perform t.ok((select count(*) from public.product_costs) = 0, 'cashier cannot read cost prices');
  perform t.denied(format('insert into public.products (shop_id,name,sale_price) values (%L,''Cake2'',9000)', sa), 'cashier cannot add products');
  perform t.denied(format('insert into public.expenses (shop_id,category,amount) values (%L,''Rent'',100)', sa), 'cashier cannot add expenses');
  perform t.denied(format('insert into public.sales (shop_id,bill_no,subtotal,total) values (%L,''D9-000001'',100,100)', sa), 'cashier cannot insert sales directly');
  perform t.denied(format('insert into public.ledger_entries (shop_id,party_id,amount,kind) values (%L,%L,-500,''adjust'')', sa, gen_random_uuid()), 'cashier cannot post ledger adjustments');
  perform t.denied(format('insert into public.stock_movements (shop_id,product_id,qty,reason) values (%L,%L,-50,''adjust'')', sa, p1), 'cashier cannot hide stock with adjustments');
  perform t.denied(format('insert into public.returns (shop_id,sale_id,refund_mode,total) values (%L,%L,''cash'',99999)', sa, gen_random_uuid()), 'cashier cannot invent a cash return');
  perform t.denied(format('insert into public.cash_closings (shop_id,day,opening,expected,counted) values (%L,current_date,0,0,0)', sa), 'cashier cannot write cash closings');

  ---------- devices ----------
  perform t.ok(public.register_device(sa, dev_c, 'Cashier phone') = 'D1', 'first device gets code D1');
  perform t.as_user(a);
  perform t.ok(public.register_device(sa, dev_a, 'Owner phone') = 'D2', 'second device gets code D2');
  perform t.ok(public.register_device(sa, dev_a, 'Owner phone') = 'D2', 'registering again returns the same code');

  ---------- selling through record_sale ----------
  perform t.as_user(a);
  insert into public.stock_movements (shop_id, product_id, qty, reason) values (sa, p1, 50, 'opening');
  insert into public.parties (id, shop_id, kind, name, credit_limit) values (cust, sa, 'customer', 'Ahmed Raza', 600000);
  insert into public.parties (id, shop_id, kind, name) values (sup, sa, 'supplier', 'Al-Noor Traders');
  perform t.as_user(c);
  res := public.record_sale(t.sale(sa, s1, 'D1-000001', null, jsonb_build_array(t.item(p1, 2, 5000)), jsonb_build_array(t.pay('cash', 10000))));
  perform t.ok((res ->> 'total')::bigint = 10000, 'cashier sale recorded with server-computed total');
  perform t.ok((public.record_sale(t.sale(sa, s1, 'D1-000001', null, jsonb_build_array(t.item(p1, 2, 5000)), jsonb_build_array(t.pay('cash', 10000)))) ->> 'duplicate')::boolean,
               'retrying the same sale id is a no-op');
  perform t.ok((select stock_qty from public.products where id = p1) = 48, 'stock went down once, not twice');
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'D1-000002', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 100)))::text),
                 'P0001', 'payments must equal the total');
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'bad bill', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 5000)))::text),
                 '23514', 'bill number format enforced');
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'D1-000001', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 5000)))::text),
                 '23505', 'bill number cannot repeat in a shop');
  perform t.as_user(a);
  perform t.ok((select unit_cost from public.sale_item_costs where sale_item_id in (select id from public.sale_items where sale_id = s1)) = 3500, 'owner sees cost snapshot');
  perform t.as_user(c);
  perform t.ok((select count(*) from public.sale_item_costs) = 0, 'cashier cannot see cost snapshot');
  -- discounts
  perform t.as_user(a); update public.memberships set permissions = '{"see_cost":false,"edit_sales":false,"give_discount":false}' where user_id = c;
  perform t.as_user(c);
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'D1-000003', null, jsonb_build_array(t.item(p1, 1, 1)), jsonb_build_array(t.pay('cash', 1)))::text),
                 '42501', 'selling below list price needs the discount permission');
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'D1-000003', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 4000)), 1000)::text),
                 '42501', 'bill discount needs the discount permission');
  perform t.as_user(a); update public.memberships set permissions = '{"see_cost":false,"edit_sales":false,"give_discount":true}' where user_id = c;
  perform t.as_user(c);
  res := public.record_sale(t.sale(sa, gen_random_uuid(), 'D1-000003', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 4500)), 500));
  perform t.ok((res ->> 'total')::bigint = 4500, 'allowed bill discount applied');
  -- khata sale
  res := public.record_sale(t.sale(sa, s2, 'D1-000004', cust, jsonb_build_array(t.item(p1, 2, 5000)), jsonb_build_array(t.pay('khata', 10000))));
  perform t.ok((select balance from public.parties where id = cust) = 10000, 'khata sale posts to the customer ledger');
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'D1-000005', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('khata', 5000)))::text),
                 'P0001', 'khata sale without a customer rejected');
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'D1-000005', cust, jsonb_build_array(t.item(p2, 7, 90000)), jsonb_build_array(t.pay('khata', 630000)))::text),
                 'P0001', 'credit limit enforced on khata sales');
  -- backdating
  res := public.record_sale(t.sale(sa, s3, 'D1-000006', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 5000)), 0, now() - interval '30 days'));
  perform t.ok((select sold_at from public.sales where id = s3) > now() - interval '1 minute', 'cashier cannot backdate a sale by 30 days');
  -- khata payments and credit
  perform t.code(format('select public.record_ledger_entry(%L,%L,%L,''credit'',5000)', sa, gen_random_uuid(), cust), '42501', 'cashier cannot give credit');
  perform public.record_ledger_entry(sa, led1, cust, 'payment', 3000, 'cash');
  perform t.ok((select balance from public.parties where id = cust) = 7000, 'customer payment lowers the balance');
  perform t.ok((public.record_ledger_entry(sa, led1, cust, 'payment', 3000, 'cash') ->> 'duplicate')::boolean, 'payment retry is a no-op');
  perform t.ok((select balance from public.parties where id = cust) = 7000, 'balance unchanged by the retry');

  ---------- ledger and stock integrity (manager direct writes) ----------
  perform t.as_user(m);
  perform t.code(format('insert into public.ledger_entries (shop_id,party_id,amount,kind) values (%L,%L,500,''payment'')', sa, cust), '23514', 'a payment must reduce the balance');
  perform t.code(format('insert into public.ledger_entries (shop_id,party_id,amount,kind) values (%L,%L,500,''purchase'')', sa, cust), 'P0001', 'purchase entries need a supplier party');
  perform t.code(format('insert into public.stock_movements (shop_id,product_id,qty,reason) values (%L,%L,1,''sale'')', sa, p1), '23514', 'a sale cannot add stock');
  perform t.code(format('insert into public.sales (shop_id,bill_no,subtotal,discount,total) values (%L,''D9-000009'',100,0,50)', sa), '23514', 'sale total must equal subtotal minus discount');
  perform t.code(format('insert into public.sale_items (shop_id,sale_id,product_id,name,qty,unit_price,line_total) values (%L,%L,%L,''x'',2,100,5)', sa, s1, p1), '23514', 'line total must equal qty x price');
  insert into public.ledger_entries (shop_id, party_id, amount, kind) values (sa, cust, 500, 'credit') returning id into e1;
  insert into public.ledger_entries (shop_id, party_id, amount, kind, reversed_of) values (sa, cust, -500, 'reversal', e1);
  perform t.code(format('insert into public.ledger_entries (shop_id,party_id,amount,kind,reversed_of) values (%L,%L,-500,''reversal'',%L)', sa, cust, e1), '23505', 'an entry cannot be reversed twice');
  perform t.code(format('insert into public.ledger_entries (shop_id,party_id,amount,kind) values (%L,%L,-5,''reversal'')', sa, cust), '23514', 'a reversal must name the entry it reverses');
  perform t.code(format('update public.ledger_entries set amount = 1 where id = %L', e1), '42501', 'ledger entries cannot be edited');
  perform t.as_super();
  perform t.code(format('update public.ledger_entries set amount = 1 where id = %L', e1), 'P0001', 'even the backend cannot edit the ledger');

  ---------- returns and voids ----------
  perform t.as_user(c);
  select id into si1 from public.sale_items where sale_id = s1 limit 1;
  perform t.code(format('select public.record_return(%L::jsonb)', jsonb_build_object('shop_id', sa, 'id', r1, 'sale_id', s1, 'refund_mode', 'cash',
      'items', jsonb_build_array(jsonb_build_object('sale_item_id', si1, 'qty', 1)))::text), '42501', 'cashier without edit_sales cannot take returns');
  perform t.code(format('select public.void_sale(%L,%L)', sa, s1), '42501', 'cashier without edit_sales cannot void');
  perform t.as_user(a); update public.memberships set permissions = '{"see_cost":false,"edit_sales":true,"give_discount":true}' where user_id = c;
  perform t.as_user(c);
  select stock_qty into n from public.products where id = p1;
  res := public.record_return(jsonb_build_object('shop_id', sa, 'id', r1, 'sale_id', s1, 'refund_mode', 'cash',
      'items', jsonb_build_array(jsonb_build_object('sale_item_id', si1, 'qty', 1))));
  perform t.ok((res ->> 'total')::bigint = 5000, 'return refunds what was paid');
  perform t.ok((select stock_qty from public.products where id = p1) = n + 1, 'return puts the item back in stock');
  perform t.code(format('select public.record_return(%L::jsonb)', jsonb_build_object('shop_id', sa, 'id', gen_random_uuid(), 'sale_id', s1, 'refund_mode', 'cash',
      'items', jsonb_build_array(jsonb_build_object('sale_item_id', si1, 'qty', 2)))::text), 'P0001', 'cannot return more than was sold');
  perform t.code(format('select public.void_sale(%L,%L)', sa, s1), 'P0001', 'a sale with returns cannot be voided');
  select stock_qty into n from public.products where id = p1;
  perform public.void_sale(sa, s2, 'customer cancelled');
  perform t.ok((select stock_qty from public.products where id = p1) = n + 2, 'void puts stock back');
  perform t.ok((select status from public.sales where id = s2) = 'voided', 'sale marked voided');
  perform t.ok((select count(*) from public.ledger_entries where ref_id = s2 and kind = 'reversal') = 1, 'void reverses the khata entry');
  perform t.code(format('select public.void_sale(%L,%L)', sa, s2), 'P0001', 'cannot void twice');
  perform t.as_user(a);
  perform t.ok((select count(*) from public.audit_log where table_name = 'sales' and row_id = s2) >= 1, 'void is audited');
  update public.memberships set permissions = '{"see_cost":false,"edit_sales":false,"give_discount":true}' where user_id = c;

  ---------- column grants and guards ----------
  perform t.code(format('update public.sales set total = 1 where id = %L', s1), '42501', 'sale totals cannot be edited');
  perform t.code(format('update public.sales set created_by = %L where id = %L', d, s1), '42501', 'created_by cannot be rewritten');
  perform t.code(format('update public.products set shop_id = %L where id = %L', sb, p1), '42501', 'rows cannot be moved to another shop');
  perform t.ok((select count(*) from public.audit_log where table_name = 'memberships') >= 1, 'permission changes are audited');
  update public.sales set note = 'checked' where id = s1;
  perform t.ok((select count(*) from public.audit_log where table_name = 'sales' and row_id = s1) = 1, 'editing a sale note is audited');
  perform t.code(format('update public.products set stock_qty = 999 where id = %L', p1), '42501', 'client cannot write stock_qty directly');
  perform t.as_user(c);
  update public.parties set credit_limit = 99999999 where id = cust;
  perform t.ok((select credit_limit from public.parties where id = cust) = 600000, 'cashier cannot raise a credit limit');
  perform t.as_user(m);
  update public.parties set credit_limit = 700000 where id = cust;
  perform t.ok((select credit_limit from public.parties where id = cust) = 700000, 'manager can change a credit limit');
  update public.product_costs set cost_price = 3600 where product_id = p1;
  update public.products set sale_price = 5500 where id = p1;
  perform t.ok((select count(*) from public.audit_log) = 0, 'managers cannot read the audit log');
  perform t.as_user(a);
  perform t.ok((select count(distinct table_name) from public.audit_log where table_name in ('products', 'product_costs', 'parties')) = 3,
               'price, cost and credit-limit changes are each audited (owner can read)');
  update public.products set sale_price = 5000 where id = p1;
  perform t.as_super();
  perform t.code('update public.audit_log set action = ''x''', 'P0001', 'audit log is append-only');

  ---------- sync cursor ----------
  perform t.as_user(a);
  select sync_seq into seq0 from public.products where id = p1;
  insert into public.stock_movements (shop_id, product_id, qty, reason) values (sa, p1, 5, 'purchase');
  select sync_seq into seq1 from public.products where id = p1;
  perform t.ok(seq0 = seq1, 'stock movement does not bump the product sync cursor');
  update public.products set name = 'Bread loaf' where id = p1;
  select sync_seq into seq1 from public.products where id = p1;
  perform t.ok(seq1 > seq0, 'editing a product bumps its sync cursor');
  select sync_seq into seq0 from public.parties where id = cust;
  insert into public.ledger_entries (shop_id, party_id, amount, kind) values (sa, cust, 1, 'adjust');
  select sync_seq into seq1 from public.parties where id = cust;
  perform t.ok(seq0 = seq1, 'a khata entry does not bump the customer sync cursor');
  perform t.ok((select sync_seq from public.ledger_entries order by sync_seq desc limit 1) > seq0, 'new ledger rows get a fresh sync number');

  ---------- limits ----------
  perform t.as_super();
  update public.plans set limits = limits || jsonb_build_object('products', (select count(*) from public.products where shop_id = sa and deleted_at is null),
                                                                 'users', (select count(*) from public.memberships where shop_id = sa and active)) where id = 'standard';
  perform t.as_user(a);
  perform t.code(format('insert into public.products (shop_id,name,sale_price) values (%L,''Over'',1)', sa), 'P0001', 'product limit enforced');
  perform t.code(format('insert into public.memberships (shop_id,user_id,role) values (%L,%L,''cashier'')', sa, d), 'P0001', 'user limit enforced');
  update public.products set deleted_at = now() where id = p2;
  insert into public.products (shop_id, name, sale_price) values (sa, 'Replacement', 1);
  perform t.code(format('update public.products set deleted_at = null where id = %L', p2), 'P0001', 'cannot un-delete past the product limit');
  update public.memberships set active = false where user_id = c;
  insert into public.memberships (shop_id, user_id, role) values (sa, d, 'cashier');
  perform t.code(format('update public.memberships set active = true where user_id = %L', c), 'P0001', 'cannot re-activate a member past the user limit');
  perform t.as_super();
  delete from public.memberships where user_id = d and shop_id = sa;
  update public.plans set limits = limits || '{"products":null,"users":3}' where id = 'standard';
  update public.memberships set active = true where user_id = c and shop_id = sa;

  ---------- function exposure ----------
  perform t.as_user(a);
  perform t.code(format('select app.access(%L)', sb), '42501', 'app.access is not callable by app users');
  perform t.code(format('select app.plan_limits(%L)', sb), '42501', 'app.plan_limits is not callable by app users');
  perform t.as_role('anon');
  perform t.denied('select public.create_shop(''x'',''x'',''x'')', 'anon cannot create shops');
  perform t.denied('select public.record_sale(''{}''::jsonb)', 'anon cannot record sales');
  perform t.as_super();
  perform t.ok((select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) = 0, 'every public table has RLS enabled');
  perform t.ok((select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public') = 0, 'anon has no table grants');

  ---------- subscriptions and access ----------
  update public.shops set setup_until = now() - interval '1 day' where id = sa;
  perform t.as_user(a);
  perform t.ok(public.get_entitlement(sa) ->> 'access' = 'read_only', 'no subscription and setup window over: read_only');
  perform t.ok((select count(*) from public.products) >= 2, 'read_only shop can still read');
  perform t.denied(format('insert into public.products (shop_id,name,sale_price) values (%L,''Late'',1)', sa), 'read_only shop cannot write');
  perform t.code(format('select public.record_sale(%L::jsonb)', t.sale(sa, gen_random_uuid(), 'D2-000100', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 5000)))::text),
                 'P0001', 'read_only shop cannot sell');
  perform t.denied(format('select public.apply_subscription_event(''google'',''x'',%L,''t'',''{}'',''p'',''standard'',''monthly'',''active'',now(),null,true,''t0'')', sa), 'app users cannot call apply_subscription_event');

  perform t.as_role('service_role');
  ok_ := public.apply_subscription_event('google', 'evt-1', sa, 'PURCHASED', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'trial', t0 + interval '14 days', null, true, 'GPA.1', t0 - interval '60 minutes');
  perform t.ok(ok_, 'store event applied');
  ok_ := public.apply_subscription_event('google', 'evt-1', sa, 'PURCHASED', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'trial', t0 + interval '14 days', null, true, 'GPA.1', t0 - interval '60 minutes');
  perform t.ok(not ok_, 'repeated store event is ignored');
  perform t.ok(public.apply_subscription_event('google', 'evt-unmapped', null, 'PURCHASED', '{"note":"no shop"}', 'p', 'standard', 'monthly', 'trial', null, null, true, 'GPA.9'),
               'event for an unmapped purchase is kept without breaking');
  perform t.as_user(a);
  ent := public.get_entitlement(sa);
  perform t.ok(ent ->> 'access' = 'full' and ent ->> 'plan_id' = 'standard' and ent ->> 'status' = 'trial', 'trial grants full access on the standard plan');
  perform t.ok(public.record_sale(t.sale(sa, gen_random_uuid(), 'D2-000101', null, jsonb_build_array(t.item(p1, 1, 5000)), jsonb_build_array(t.pay('cash', 5000)))) is not null,
               'selling works again after the trial starts');

  perform t.as_role('service_role');
  perform public.apply_subscription_event('google', 'evt-0', sa, 'EXPIRED', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'expired', t0 + interval '14 days', null, false, 'GPA.1', t0 - interval '50 minutes');
  perform t.as_user(a);
  perform t.ok(public.get_entitlement(sa) ->> 'status' = 'expired', 'a newer expiry event is applied');
  perform t.as_role('service_role');
  perform public.apply_subscription_event('google', 'evt-2', sa, 'RENEWED', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'active', t0 + interval '30 days', null, true, 'GPA.1', t0 - interval '40 minutes');
  perform public.apply_subscription_event('google', 'evt-3', sa, 'LATE_TRIAL', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'trial', t0 + interval '14 days', null, true, 'GPA.1', t0 - interval '100 minutes');
  perform public.apply_subscription_event('google', 'evt-3b', sa, 'LATE_EXPIRED', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'expired', t0 - interval '30 days', null, false, 'GPA.1', t0 - interval '90 minutes');
  perform public.apply_subscription_event('google', 'evt-3c', sa, 'LATE_REFUND', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'refunded', t0 - interval '30 days', null, false, 'GPA.1', t0 - interval '80 minutes');
  perform t.as_user(a);
  perform t.ok(public.get_entitlement(sa) ->> 'status' = 'active', 'late older notifications (trial, expired, refund) do not undo a renewal');
  perform t.as_role('service_role');
  perform public.apply_subscription_event('google', 'evt-4', sa, 'ON_HOLD', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'hold', t0 + interval '30 days', null, true, 'GPA.1', t0 - interval '30 minutes');
  perform t.as_user(a);
  perform t.ok(public.get_entitlement(sa) ->> 'access' = 'read_only', 'account hold is read_only');
  perform t.as_role('service_role');
  perform public.apply_subscription_event('google', 'evt-5', sa, 'GRACE', '{}', 'dukaan_standard_monthly', 'standard', 'monthly',
                                          'grace', t0 + interval '30 days', t0 + interval '5 days', true, 'GPA.1', t0 - interval '20 minutes');
  perform t.as_user(a);
  perform t.ok(public.get_entitlement(sa) ->> 'access' = 'full', 'grace period keeps full access');

  ---------- admin ----------
  perform t.as_user(adm);
  perform t.ok((select count(*) from public.shops) = 2, 'platform admin can read all shops');
  perform t.as_user(a);
  perform t.denied('select * from public.subscription_events', 'app users cannot read raw store events');
  perform t.denied('select * from public.platform_admins', 'app users cannot read admin list');
  perform t.denied(format('insert into public.entitlement_overrides (shop_id, comp_until) values (%L, now() + interval ''1 year'')', sa), 'owner cannot grant themselves free access');
  perform t.as_user(adm);
  insert into public.entitlement_overrides (shop_id, suspended, note) values (sb, true, 'policy test');
  perform t.as_user(b);
  perform t.ok(public.get_entitlement(sb) ->> 'access' = 'read_only', 'admin suspension makes the shop read_only');
  perform t.as_role('anon');
  perform t.denied('select * from public.shops', 'anon has no access');
  perform t.as_super();
  raise notice 'ALL PHASE 1 CHECKS PASSED';
end $$;
