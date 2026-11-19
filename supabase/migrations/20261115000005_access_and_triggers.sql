-- Phase 1, step 5: access rules (who may read, who may write) and data-integrity triggers.
-- All helpers are SECURITY DEFINER so they can read memberships/subscriptions regardless of RLS.
-- Policies call them as (select app.xxx()) so Postgres evaluates each once per query, not per row.

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- Plan whose limits apply to a shop right now.
create or replace function app.effective_plan(p_shop uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    case when o.comp_until > now() then coalesce(o.plan_id, 'standard') end,
    s.plan_id,
    'standard')
  from public.shops sh
  left join public.subscriptions s on s.shop_id = sh.id
  left join public.entitlement_overrides o on o.shop_id = sh.id
  where sh.id = p_shop
$$;

create or replace function app.plan_limits(p_shop uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select limits from public.plans where id = app.effective_plan(p_shop)), '{}'::jsonb)
$$;

-- 'full' lets members write. 'read_only' lets them look and export, nothing else.
-- Mirrors the app: trial/active/grace/cancelled-until-period-end are full, hold/expired/refunded are read-only.
create or replace function app.access(p_shop uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(o.suspended, false) then 'read_only'
    when o.comp_until > now() then 'full'
    when s.status = 'grace' and s.grace_until > now() then 'full'
    -- one day of slack so a late store renewal notification does not lock a paying shop out
    when s.status in ('trial', 'active', 'cancelled') and s.current_period_end + interval '1 day' > now() then 'full'
    when sh.setup_until > now() then 'full'
    else 'read_only'
  end
  from public.shops sh
  left join public.subscriptions s on s.shop_id = sh.id
  left join public.entitlement_overrides o on o.shop_id = sh.id
  where sh.id = p_shop
$$;

create or replace function app.my_shop_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select shop_id from public.memberships where user_id = auth.uid() and active
$$;

create or replace function app.writable_shop_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.shop_id from public.memberships m
  where m.user_id = auth.uid() and m.active and app.access(m.shop_id) = 'full'
$$;

-- Shops where the caller is owner or manager (any access level).
create or replace function app.manager_shop_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select shop_id from public.memberships
  where user_id = auth.uid() and active and role in ('owner', 'manager')
$$;

create or replace function app.owner_shop_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select shop_id from public.memberships
  where user_id = auth.uid() and active and role = 'owner'
$$;

-- Shops where the caller holds a permission: owners and managers always, cashiers when the owner switched it on.
create or replace function app.perm_shop_ids(p_key text) returns setof uuid
language sql stable security definer set search_path = public as $$
  select shop_id from public.memberships
  where user_id = auth.uid() and active
    and (role in ('owner', 'manager') or coalesce((permissions ->> p_key)::boolean, false))
$$;

-- ---------- integrity triggers ----------

create or replace function app.apply_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.products set stock_qty = stock_qty + new.qty where shop_id = new.shop_id and id = new.product_id;
  if new.variant_id is not null then
    update public.product_variants set stock_qty = stock_qty + new.qty where shop_id = new.shop_id and id = new.variant_id;
  end if;
  return new;
end $$;
create trigger stock_movements_apply after insert on public.stock_movements for each row execute function app.apply_stock();
create trigger stock_movements_immutable before update or delete on public.stock_movements for each row execute function app.immutable();

create or replace function app.apply_ledger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.parties set balance = balance + new.amount where shop_id = new.shop_id and id = new.party_id;
  return new;
end $$;
create trigger ledger_apply after insert on public.ledger_entries for each row execute function app.apply_ledger();
create trigger ledger_immutable before update or delete on public.ledger_entries for each row execute function app.immutable();

-- Clients cannot write the cached columns directly.
create or replace function app.guard_cached() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if tg_table_name = 'parties' then new.balance := 0; else new.stock_qty := 0; end if;
  elsif current_user in ('authenticated', 'anon') then
    if tg_table_name = 'parties' then new.balance := old.balance; else new.stock_qty := old.stock_qty; end if;
  end if;
  return new;
end $$;
create trigger parties_guard before insert or update on public.parties for each row execute function app.guard_cached();
create trigger products_guard before insert or update on public.products for each row execute function app.guard_cached();
create trigger variants_guard before insert or update on public.product_variants for each row execute function app.guard_cached();

-- Snapshot the cost of each sold item without making the cashier read product_costs.
create or replace function app.snapshot_cost() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.sale_item_costs (shop_id, sale_item_id, unit_cost)
  select new.shop_id, new.id, c.cost_price
  from public.product_costs c where c.shop_id = new.shop_id and c.product_id = new.product_id
  on conflict do nothing;
  return new;
end $$;
create trigger sale_items_cost after insert on public.sale_items for each row execute function app.snapshot_cost();

-- Plan limits. null in plans.limits means unlimited.
create or replace function app.enforce_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer;
begin
  if tg_table_name = 'products' then
    v_limit := (app.plan_limits(new.shop_id) ->> 'products')::integer;
    if v_limit is not null then
      select count(*) into v_count from public.products where shop_id = new.shop_id and deleted_at is null;
      if v_count >= v_limit then
        raise exception 'Product limit (%) reached for this plan', v_limit using errcode = 'P0001';
      end if;
    end if;
  elsif tg_table_name = 'memberships' then
    v_limit := (app.plan_limits(new.shop_id) ->> 'users')::integer;
    if v_limit is not null then
      select count(*) into v_count from public.memberships where shop_id = new.shop_id and active;
      if v_count >= v_limit then
        raise exception 'User limit (%) reached for this plan', v_limit using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger products_limit before insert on public.products for each row execute function app.enforce_limits();
create trigger memberships_limit before insert on public.memberships for each row execute function app.enforce_limits();

-- Audit trail for the changes owners care about: price edits, voided sales, role changes.
create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_new jsonb := to_jsonb(new); v_old jsonb := to_jsonb(old);
begin
  -- compare as jsonb: plpgsql cannot read old.<column> for a column the current table does not have
  if tg_table_name = 'products' and v_old -> 'sale_price' is not distinct from v_new -> 'sale_price' then return new; end if;
  if tg_table_name = 'sales' and v_old -> 'status' is not distinct from v_new -> 'status' then return new; end if;
  if tg_table_name = 'memberships' and (v_old -> 'role', v_old -> 'active', v_old -> 'permissions')
     is not distinct from (v_new -> 'role', v_new -> 'active', v_new -> 'permissions') then return new; end if;
  insert into public.audit_log (shop_id, user_id, table_name, row_id, action, old_row, new_row)
  values (new.shop_id, auth.uid(), tg_table_name,
          case when tg_table_name = 'memberships' then null else (v_new ->> 'id')::uuid end,
          'update', v_old, v_new);
  return new;
end $$;
create trigger products_audit after update on public.products for each row execute function app.audit();
create trigger sales_audit after update on public.sales for each row execute function app.audit();
create trigger memberships_audit after update on public.memberships for each row execute function app.audit();
