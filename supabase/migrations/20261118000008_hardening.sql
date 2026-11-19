-- Phase 1 hardening, from the schema and security reviews.
-- 1. Reliable sync: monotonic sync_seq instead of timestamps, tombstones, device codes.
-- 2. Writes that move money go through server functions (see migration 09). Direct inserts are manager-only.
-- 3. Column-level update grants, no client deletes, stronger integrity checks, wider audit.
--
-- Sync rule for the client: pull rows with sync_seq > cursor - OVERLAP (suggest 500), upsert by id
-- (idempotent), then advance the cursor to the highest sync_seq seen. Sequence values are handed out
-- when a statement runs, not when it commits, so a slow transaction can commit "behind" the cursor.
-- The overlap window covers that; pull_changes() in the backend should also cap at the oldest open transaction.

create sequence if not exists public.sync_seq;
grant usage on sequence public.sync_seq to authenticated, service_role;

-- ---------- sync columns ----------
do $$
declare t text;
begin
  foreach t in array array['categories','products','product_costs','product_variants','product_barcodes','parties','sales',
    'sale_items','payments','returns','purchases','expenses','memberships',
    'stock_movements','ledger_entries','return_items','sale_item_costs','cash_closings','purchase_items'] loop
    execute format('alter table public.%I add column if not exists sync_seq bigint not null default nextval(''public.sync_seq'')', t);
    execute format('create index if not exists %I on public.%I (shop_id, sync_seq)', t || '_seq', t);
  end loop;
end $$;
drop index if exists public.categories_sync, public.products_sync, public.parties_sync, public.sales_sync,
  public.ledger_sync, public.stock_movements_sync;

-- tombstones for rows that clients may remove (clients can no longer hard delete anything)
alter table public.product_barcodes add column if not exists deleted_at timestamptz;
alter table public.purchases        add column if not exists deleted_at timestamptz;
alter table public.expenses         add column if not exists deleted_at timestamptz;
alter table public.purchase_items   add column if not exists deleted_at timestamptz;
alter table public.purchase_items   add column if not exists updated_at timestamptz not null default now();
create trigger purchase_items_touch before update on public.purchase_items for each row execute function app.touch();

-- updated_at and sync_seq move together on every real change
create or replace function app.touch() returns trigger
language plpgsql as $$
begin
  new := jsonb_populate_record(new, jsonb_build_object('updated_at', now(), 'sync_seq', nextval('public.sync_seq')));
  return new;
end $$;

-- Rows with a server-maintained cache (stock_qty, balance): updating only the cache must not
-- bump the sync cursor, or every phone re-downloads the product on every sale anywhere.
create or replace function app.touch_cached() returns trigger
language plpgsql as $$
declare k text[] := array['updated_at', 'sync_seq', 'stock_qty', 'balance'];
begin
  if (to_jsonb(new) - k) = (to_jsonb(old) - k) then return new; end if;
  new := jsonb_populate_record(new, jsonb_build_object('updated_at', now(), 'sync_seq', nextval('public.sync_seq')));
  return new;
end $$;
drop trigger products_touch on public.products;
drop trigger product_variants_touch on public.product_variants;
drop trigger parties_touch on public.parties;
create trigger products_touch before update on public.products for each row execute function app.touch_cached();
create trigger product_variants_touch before update on public.product_variants for each row execute function app.touch_cached();
create trigger parties_touch before update on public.parties for each row execute function app.touch_cached();

-- barcodes: reusable after the old product is removed; FK indexes the reviewer found missing
alter table public.product_barcodes drop constraint product_barcodes_shop_id_barcode_key;
create unique index product_barcodes_live on public.product_barcodes (shop_id, barcode) where deleted_at is null;
create index if not exists product_barcodes_variant on public.product_barcodes (shop_id, variant_id) where variant_id is not null;
create index if not exists stock_movements_variant on public.stock_movements (shop_id, variant_id) where variant_id is not null;
create index if not exists sale_items_variant on public.sale_items (shop_id, variant_id) where variant_id is not null;
create index if not exists return_items_sale_item on public.return_items (shop_id, sale_item_id);
create index if not exists return_items_product on public.return_items (shop_id, product_id);
create index if not exists purchase_items_product on public.purchase_items (shop_id, product_id);
create index if not exists purchases_supplier on public.purchases (shop_id, supplier_id) where supplier_id is not null;
create index if not exists returns_sale on public.returns (shop_id, sale_id);
create index if not exists payments_party on public.payments (shop_id, party_id) where party_id is not null;
create index if not exists ledger_reversed_of on public.ledger_entries (shop_id, reversed_of) where reversed_of is not null;

-- ---------- devices: server-assigned codes so two phones can never share a bill-number prefix ----------
create table public.devices (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  user_id    uuid references auth.users (id),
  n          integer not null check (n > 0),
  code       text generated always as ('D' || n::text) stored,
  name       text,
  created_at timestamptz not null default now(),
  unique (shop_id, n),
  unique (shop_id, id)
);
alter table public.devices enable row level security;
create policy devices_read on public.devices for select to authenticated using (shop_id in (select app.my_shop_ids()));
grant select on public.devices to authenticated;
revoke all on public.devices from anon;

-- ---------- integrity checks ----------
alter table public.sales add constraint sales_bill_no_fmt check (bill_no ~ '^D[0-9]+-[0-9]+$');
alter table public.sales add constraint sales_discount_le_subtotal check (discount <= subtotal);
alter table public.sales add constraint sales_total_ok check (total = subtotal - discount);
alter table public.sale_items add constraint sale_items_line_ok check (line_total = round(qty * unit_price));
alter table public.purchases add constraint purchases_paid_le_total check (paid <= total);
alter table public.cash_closings add constraint cash_closings_nonneg check (opening >= 0 and expected >= 0 and counted >= 0);

alter table public.ledger_entries add constraint ledger_sign_ok check (
  case kind when 'sale' then amount > 0 when 'credit' then amount > 0 when 'purchase' then amount > 0
            when 'payment' then amount < 0 when 'supplier_payment' then amount < 0 else true end);
alter table public.ledger_entries add constraint ledger_reversal_ok check ((kind = 'reversal') = (reversed_of is not null));
create unique index ledger_one_reversal on public.ledger_entries (shop_id, reversed_of) where reversed_of is not null;

alter table public.stock_movements add constraint stock_sign_ok check (
  (reason in ('sale', 'damage', 'expiry') and qty < 0) or (reason in ('opening', 'purchase', 'return') and qty > 0) or reason = 'adjust');

create or replace function app.valid_perms(p jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p) = 'object'
     and not exists (select 1 from jsonb_each(p) e where jsonb_typeof(e.value) <> 'boolean')
$$;
alter table public.memberships add constraint memberships_permissions_valid check (app.valid_perms(permissions));
alter table public.memberships alter column permissions set default '{"see_cost":false,"edit_sales":false,"give_discount":true}';
grant execute on function app.valid_perms(jsonb) to authenticated, service_role;

-- ---------- permission helpers used by the server functions ----------
create or replace function app.has_perm(p_shop uuid, p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner', 'manager') or coalesce((permissions ->> p_key)::boolean, false)
                     from public.memberships where shop_id = p_shop and user_id = auth.uid() and active), false)
$$;
create or replace function app.is_manager(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where shop_id = p_shop and user_id = auth.uid() and active and role in ('owner', 'manager'))
$$;
-- Raises unless the caller is an active member of a shop that currently has full access.
create or replace function app.require_write(p_shop uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_shop is null or not (p_shop in (select app.my_shop_ids())) then
    raise exception 'not a member of this shop' using errcode = '42501';
  end if;
  if app.access(p_shop) <> 'full' then
    raise exception 'This shop is read-only until the subscription is active' using errcode = 'P0001';
  end if;
end $$;

-- ---------- server-controlled columns ----------
-- created_by always comes from the session. Non-managers cannot backdate more than 7 days
-- (offline sync is allowed) or post-date more than a day.
create or replace function app.stamp() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb := to_jsonb(new); k text;
begin
  if auth.uid() is null then return new; end if;
  v := v || jsonb_build_object('created_by', auth.uid(), 'closed_by', auth.uid());
  if not app.is_manager(new.shop_id) then
    foreach k in array array['created_at', 'sold_at'] loop
      if v ? k and not ((v ->> k)::timestamptz between now() - interval '7 days' and now() + interval '1 day') then
        v := v || jsonb_build_object(k, now());
      end if;
    end loop;
    if tg_table_name = 'sales' then v := v || '{"status":"completed"}'; end if;
  end if;
  return jsonb_populate_record(new, v);
end $$;
do $$
declare t text;
begin
  foreach t in array array['sales', 'ledger_entries', 'stock_movements', 'returns', 'expenses', 'purchases', 'cash_closings', 'payments'] loop
    execute format('create trigger %I before insert on public.%I for each row execute function app.stamp()', t || '_stamp', t);
  end loop;
end $$;

-- a customer entry must hit a customer, a supplier entry a supplier
create or replace function app.ledger_party_kind() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_kind text;
begin
  select kind into v_kind from public.parties where shop_id = new.shop_id and id = new.party_id;
  if (new.kind in ('sale', 'payment', 'credit') and v_kind <> 'customer')
     or (new.kind in ('purchase', 'supplier_payment') and v_kind <> 'supplier') then
    raise exception 'ledger kind % does not match a % party', new.kind, v_kind using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger ledger_party_kind before insert on public.ledger_entries for each row execute function app.ledger_party_kind();

-- only owners and managers change a credit limit
create or replace function app.guard_credit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.credit_limit is distinct from old.credit_limit and not app.is_manager(new.shop_id) then
    new.credit_limit := old.credit_limit;
  end if;
  return new;
end $$;
create trigger parties_credit_guard before update on public.parties for each row execute function app.guard_credit();

-- ---------- limits: also on un-delete / re-activate, and no oracle on foreign shops ----------
create or replace function app.enforce_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer;
begin
  -- creating a shop inserts the owner membership before the caller is a member of it
  if auth.uid() is not null and not (tg_table_name = 'memberships' and to_jsonb(new) ->> 'role' = 'owner')
     and not (new.shop_id in (select app.my_shop_ids())) then
    raise exception 'new row violates row-level security policy for table "%"', tg_table_name using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    -- only an un-delete (products) or a re-activation (memberships) can push a shop over its limit
    if tg_table_name = 'products' and not (to_jsonb(old) ->> 'deleted_at' is not null and to_jsonb(new) ->> 'deleted_at' is null) then
      return new;
    end if;
    if tg_table_name = 'memberships' and not ((to_jsonb(old) ->> 'active')::boolean is false and (to_jsonb(new) ->> 'active')::boolean) then
      return new;
    end if;
  end if;
  if tg_table_name = 'products' then
    v_limit := (app.plan_limits(new.shop_id) ->> 'products')::integer;
    if v_limit is not null then
      select count(*) into v_count from public.products where shop_id = new.shop_id and deleted_at is null;
      if v_count >= v_limit then raise exception 'Product limit (%) reached for this plan', v_limit using errcode = 'P0001'; end if;
    end if;
  elsif tg_table_name = 'memberships' then
    v_limit := (app.plan_limits(new.shop_id) ->> 'users')::integer;
    if v_limit is not null then
      select count(*) into v_count from public.memberships where shop_id = new.shop_id and active;
      if v_count >= v_limit then raise exception 'User limit (%) reached for this plan', v_limit using errcode = 'P0001'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger products_limit_undelete before update of deleted_at on public.products for each row execute function app.enforce_limits();
create trigger memberships_limit_reactivate before update of active on public.memberships for each row execute function app.enforce_limits();

-- ---------- audit: every change to money-relevant fields, and the log itself is append-only ----------
create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_new jsonb := to_jsonb(new); v_old jsonb := to_jsonb(old); k text; v_watch text[];
begin
  v_watch := case tg_table_name
    when 'products' then array['sale_price']
    when 'product_costs' then array['cost_price']
    when 'parties' then array['credit_limit']
    when 'memberships' then array['role', 'active', 'permissions']
    when 'sales' then array['status', 'total', 'discount', 'subtotal', 'party_id', 'note']
    else array[]::text[] end;
  if not exists (select 1 from unnest(v_watch) w where v_old -> w is distinct from v_new -> w) then return new; end if;
  insert into public.audit_log (shop_id, user_id, table_name, row_id, action, old_row, new_row)
  values (new.shop_id, auth.uid(), tg_table_name,
          coalesce((v_new ->> 'id')::uuid, (v_new ->> 'product_id')::uuid), 'update', v_old, v_new);
  return new;
end $$;
create trigger product_costs_audit after update on public.product_costs for each row execute function app.audit();
create trigger parties_audit after update on public.parties for each row execute function app.audit();
create trigger audit_log_immutable before update or delete on public.audit_log for each row execute function app.immutable();

-- ---------- grants: no client deletes, column-level updates only ----------
revoke update, delete on all tables in schema public from authenticated;
grant update (name, owner_name, phone, city, address, settings, template_key, template_version) on public.shops to authenticated;
grant update (role, permissions, active) on public.memberships to authenticated;
grant update (full_name, phone, locale) on public.profiles to authenticated;
grant update (name, name_ur, sort, deleted_at) on public.categories to authenticated;
grant update (category_id, name, name_ur, unit, sale_price, track_stock, min_stock, attributes, is_active, deleted_at) on public.products to authenticated;
grant update (cost_price) on public.product_costs to authenticated;
grant update (sku, attributes, sale_price, deleted_at) on public.product_variants to authenticated;
grant update (variant_id, barcode, deleted_at) on public.product_barcodes to authenticated;
grant update (name, phone, area, credit_limit, deleted_at) on public.parties to authenticated;
grant update (note) on public.sales to authenticated;
grant update (supplier_id, ref_no, total, paid, purchased_at, note, deleted_at) on public.purchases to authenticated;
grant update (product_id, qty, unit_cost, deleted_at) on public.purchase_items to authenticated;
grant update (category, amount, paid_from, note, spent_at, deleted_at) on public.expenses to authenticated;
-- admin-only through policies
grant insert, update, delete on public.plans, public.business_templates, public.entitlement_overrides to authenticated;

drop policy members_delete on public.memberships;
drop policy costs_del on public.product_costs;
drop policy categories_del on public.categories;
drop policy products_del on public.products;
drop policy product_variants_del on public.product_variants;
drop policy product_barcodes_del on public.product_barcodes;
drop policy parties_del on public.parties;
drop policy purchases_del on public.purchases;
drop policy purchase_items_del on public.purchase_items;
drop policy expenses_del on public.expenses;
drop policy sale_items_upd on public.sale_items;
drop policy sale_items_del on public.sale_items;
drop policy payments_upd on public.payments;
drop policy payments_del on public.payments;
drop policy sales_upd on public.sales;

-- Money-moving rows are written by record_sale / record_ledger_entry / record_return / void_sale
-- (migration 09). Direct inserts stay available to owners and managers only (imports, corrections).
drop policy ledger_ins on public.ledger_entries;
drop policy stock_ins on public.stock_movements;
drop policy sales_ins on public.sales;
drop policy sale_items_ins on public.sale_items;
drop policy payments_ins on public.payments;
drop policy returns_ins on public.returns;
drop policy return_items_ins on public.return_items;
drop policy closings_ins on public.cash_closings;
create policy ledger_ins on public.ledger_entries for insert to authenticated with check (shop_id in (select app.writable_manager()));
create policy stock_ins on public.stock_movements for insert to authenticated with check (shop_id in (select app.writable_manager()));
create policy sales_ins on public.sales for insert to authenticated with check (shop_id in (select app.writable_manager()));
create policy sale_items_ins on public.sale_items for insert to authenticated with check (shop_id in (select app.writable_manager()));
create policy payments_ins on public.payments for insert to authenticated with check (shop_id in (select app.writable_manager()));
create policy returns_ins on public.returns for insert to authenticated with check (shop_id in (select app.writable_manager()));
create policy return_items_ins on public.return_items for insert to authenticated with check (shop_id in (select app.writable_manager()));
create policy closings_ins on public.cash_closings for insert to authenticated with check (shop_id in (select app.writable_manager()));
-- sales: only the note can be edited, by a manager
create policy sales_upd on public.sales for update to authenticated
  using (shop_id in (select app.writable_manager())) with check (shop_id in (select app.writable_manager()));
-- staff may still add and edit customers (not delete, not change credit limits: guard_credit)

-- ---------- function exposure ----------
revoke execute on all functions in schema app from public, anon;
revoke execute on function app.access(uuid), app.effective_plan(uuid), app.plan_limits(uuid),
  app.has_perm(uuid, text), app.is_manager(uuid), app.require_write(uuid) from authenticated;
grant execute on function app.has_perm(uuid, text), app.is_manager(uuid), app.require_write(uuid), app.access(uuid) to service_role;
revoke execute on function public.create_shop(text, text, text, text, text), public.get_entitlement(uuid) from public, anon;
alter default privileges in schema public revoke all on tables from anon;

-- ---------- subscriptions: order events by their own time; unmapped purchases keep an audit row ----------
alter table public.subscriptions add column if not exists last_event_at timestamptz;
drop function public.apply_subscription_event(text, text, uuid, text, jsonb, text, text, text, text, timestamptz, timestamptz, boolean, text);
create or replace function public.apply_subscription_event(
  p_store text, p_external_id text, p_shop uuid, p_event_type text, p_payload jsonb,
  p_product_id text, p_plan_id text, p_period text, p_status text,
  p_period_end timestamptz, p_grace_until timestamptz, p_auto_renew boolean, p_original_txn text,
  p_event_time timestamptz default now())
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscription_events (store, external_id, shop_id, event_type, payload)
  values (p_store, p_external_id, p_shop, p_event_type, coalesce(p_payload, '{}'))
  on conflict (store, external_id) do nothing;
  if not found then return false; end if;
  if p_shop is null then return true; end if;   -- purchase not linked to a shop yet: keep the event, apply nothing

  insert into public.subscriptions as s (shop_id, store, product_id, plan_id, billing_period, status,
                                         current_period_end, grace_until, auto_renew, original_txn_id, last_event_at)
  values (p_shop, p_store, p_product_id, p_plan_id, p_period, p_status, p_period_end, p_grace_until, p_auto_renew, p_original_txn, p_event_time)
  on conflict (shop_id) do update set
    store = excluded.store, product_id = excluded.product_id, plan_id = excluded.plan_id,
    billing_period = excluded.billing_period, status = excluded.status,
    current_period_end = excluded.current_period_end, grace_until = excluded.grace_until,
    auto_renew = excluded.auto_renew, original_txn_id = excluded.original_txn_id, last_event_at = excluded.last_event_at
  where s.last_event_at is null or excluded.last_event_at >= s.last_event_at;
  return true;
end $$;
revoke all on function public.apply_subscription_event(text, text, uuid, text, jsonb, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(text, text, uuid, text, jsonb, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) to service_role;

-- create_shop: serialise per user so two parallel calls cannot beat the 3-shop limit
create or replace function public.create_shop(
  p_name text, p_owner_name text, p_city text, p_template_key text default 'other', p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_shop uuid; t public.business_templates;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into t from public.business_templates where key = p_template_key and published order by version desc limit 1;
  if not found then raise exception 'unknown template %', p_template_key using errcode = 'P0001'; end if;
  if (select count(*) from public.memberships where user_id = auth.uid() and role = 'owner') >= 3 then
    raise exception 'A user can own at most 3 shops' using errcode = 'P0001';
  end if;
  insert into public.shops (name, owner_name, phone, city, template_key, template_version, settings, created_by)
  values (p_name, p_owner_name, p_phone, p_city, t.key, t.version,
          jsonb_build_object('barcode', coalesce((t.config ->> 'barcode')::boolean, false),
                             'expiry',  coalesce((t.config ->> 'expiry')::boolean, false)), auth.uid())
  returning id into v_shop;
  insert into public.memberships (shop_id, user_id, role) values (v_shop, auth.uid(), 'owner');
  insert into public.categories (shop_id, name, sort)
  select v_shop, x.name, (x.ord - 1)::smallint
  from jsonb_array_elements_text(coalesce(t.config -> 'starter', '[]'::jsonb)) with ordinality as x(name, ord);
  return v_shop;
end $$;
revoke execute on function public.create_shop(text, text, text, text, text) from public, anon;
grant execute on function public.create_shop(text, text, text, text, text) to authenticated;
