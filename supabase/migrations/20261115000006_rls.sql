-- Phase 1, step 6: row level security. Default is deny; every table below gets explicit policies.
-- Roles: owner > manager > cashier. Write rules also require app.access(shop) = 'full' (paid/trial/grace).
-- The backend uses the service_role key, which bypasses RLS, for store webhooks and the admin panel.

-- Lock everything first, then open what is needed.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon', t.tablename);
  end loop;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema app to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;

-- Tables the app must never touch directly.
revoke all on public.subscription_events, public.platform_admins from authenticated;
revoke insert, update, delete on public.subscriptions, public.plans, public.business_templates from authenticated;
revoke insert, delete on public.shops from authenticated;       -- shops are created through create_shop()
revoke update on public.shops from authenticated;
grant update (name, owner_name, phone, city, address, settings, template_key, template_version) on public.shops to authenticated;
revoke update on public.memberships from authenticated;
grant update (role, permissions, active) on public.memberships to authenticated;
revoke insert, update, delete on public.sale_item_costs, public.audit_log from authenticated;
revoke insert, update, delete on public.entitlement_overrides from authenticated;

-- ---------- global reference data ----------
create policy plans_read on public.plans for select to authenticated using (true);
create policy plans_admin on public.plans for all to authenticated using ((select app.is_admin())) with check ((select app.is_admin()));
grant insert, update, delete on public.plans, public.business_templates, public.entitlement_overrides to authenticated;  -- admin only via policy

create policy templates_read on public.business_templates for select to authenticated using (published or (select app.is_admin()));
create policy templates_admin on public.business_templates for all to authenticated using ((select app.is_admin())) with check ((select app.is_admin()));

-- ---------- tenants ----------
create policy shops_read on public.shops for select to authenticated
  using (id in (select app.my_shop_ids()) or (select app.is_admin()));
create policy shops_update on public.shops for update to authenticated
  using (id in (select app.owner_shop_ids())) with check (id in (select app.owner_shop_ids()));

create policy profiles_own on public.profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy members_read on public.memberships for select to authenticated
  using (shop_id in (select app.my_shop_ids()) or (select app.is_admin()));
create policy members_insert on public.memberships for insert to authenticated
  with check (shop_id in (select app.owner_shop_ids()) and shop_id in (select app.writable_shop_ids()) and role <> 'owner');
create policy members_update on public.memberships for update to authenticated
  using (shop_id in (select app.owner_shop_ids()) and role <> 'owner')
  with check (shop_id in (select app.owner_shop_ids()) and role <> 'owner');
create policy members_delete on public.memberships for delete to authenticated
  using (shop_id in (select app.owner_shop_ids()) and role <> 'owner');
grant insert, delete on public.memberships to authenticated;

create policy subs_read on public.subscriptions for select to authenticated
  using (shop_id in (select app.my_shop_ids()) or (select app.is_admin()));
create policy overrides_read on public.entitlement_overrides for select to authenticated
  using (shop_id in (select app.my_shop_ids()) or (select app.is_admin()));
create policy overrides_admin on public.entitlement_overrides for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy events_admin on public.subscription_events for select to service_role using (true);

-- ---------- helper to declare the common patterns ----------
-- read: any member.  staff_write: any member with full access.  manager_write: owner/manager with full access.
create or replace function app.policies(p_table text, p_read text, p_staff_insert boolean, p_staff_update boolean, p_manager_delete boolean)
returns void language plpgsql as $$
begin
  execute format('create policy %I on public.%I for select to authenticated using (shop_id in (select %s))',
    p_table || '_read', p_table, p_read);
  execute format('create policy %I on public.%I for insert to authenticated with check (shop_id in (select %s))',
    p_table || '_ins', p_table, case when p_staff_insert then 'app.writable_shop_ids()' else 'app.writable_manager()' end);
  execute format('create policy %I on public.%I for update to authenticated using (shop_id in (select %s)) with check (shop_id in (select %s))',
    p_table || '_upd', p_table, case when p_staff_update then 'app.writable_shop_ids()' else 'app.writable_manager()' end,
    case when p_staff_update then 'app.writable_shop_ids()' else 'app.writable_manager()' end);
  if p_manager_delete then
    execute format('create policy %I on public.%I for delete to authenticated using (shop_id in (select app.writable_manager()))',
      p_table || '_del', p_table);
  end if;
end $$;

-- writable AND owner/manager
create or replace function app.writable_manager() returns setof uuid
language sql stable security definer set search_path = public as $$
  select shop_id from public.memberships
  where user_id = auth.uid() and active and role in ('owner', 'manager') and app.access(shop_id) = 'full'
$$;
-- writable AND holds the edit_sales permission
create or replace function app.writable_edit_sales() returns setof uuid
language sql stable security definer set search_path = public as $$
  select shop_id from public.memberships
  where user_id = auth.uid() and active and app.access(shop_id) = 'full'
    and (role in ('owner', 'manager') or coalesce((permissions ->> 'edit_sales')::boolean, false))
$$;
grant execute on function app.writable_manager(), app.writable_edit_sales() to authenticated, service_role;

-- ---------- catalog and stock ----------
select app.policies('categories',       'app.my_shop_ids()', false, false, true);
select app.policies('products',         'app.my_shop_ids()', false, false, true);
select app.policies('product_variants', 'app.my_shop_ids()', false, false, true);
select app.policies('product_barcodes', 'app.my_shop_ids()', false, false, true);

-- cost prices: only people with the see_cost permission
create policy costs_read on public.product_costs for select to authenticated
  using (shop_id in (select app.perm_shop_ids('see_cost')));
create policy costs_ins on public.product_costs for insert to authenticated
  with check (shop_id in (select app.writable_manager()));
create policy costs_upd on public.product_costs for update to authenticated
  using (shop_id in (select app.writable_manager())) with check (shop_id in (select app.writable_manager()));
create policy costs_del on public.product_costs for delete to authenticated
  using (shop_id in (select app.writable_manager()));

-- stock movements: any staff may insert (sales), nobody edits
create policy stock_read on public.stock_movements for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy stock_ins on public.stock_movements for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
revoke update, delete on public.stock_movements from authenticated;

-- ---------- khata and selling ----------
select app.policies('parties', 'app.my_shop_ids()', true, true, true);

create policy ledger_read on public.ledger_entries for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy ledger_ins on public.ledger_entries for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
revoke update, delete on public.ledger_entries from authenticated;

create policy sales_read on public.sales for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy sales_ins on public.sales for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
create policy sales_upd on public.sales for update to authenticated
  using (shop_id in (select app.writable_edit_sales())) with check (shop_id in (select app.writable_edit_sales()));

create policy sale_items_read on public.sale_items for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy sale_items_ins on public.sale_items for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
create policy sale_items_upd on public.sale_items for update to authenticated
  using (shop_id in (select app.writable_edit_sales())) with check (shop_id in (select app.writable_edit_sales()));
create policy sale_items_del on public.sale_items for delete to authenticated using (shop_id in (select app.writable_edit_sales()));

create policy item_costs_read on public.sale_item_costs for select to authenticated
  using (shop_id in (select app.perm_shop_ids('see_cost')));

create policy payments_read on public.payments for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy payments_ins on public.payments for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
create policy payments_upd on public.payments for update to authenticated
  using (shop_id in (select app.writable_edit_sales())) with check (shop_id in (select app.writable_edit_sales()));
create policy payments_del on public.payments for delete to authenticated using (shop_id in (select app.writable_edit_sales()));

create policy returns_read on public.returns for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy returns_ins on public.returns for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
create policy return_items_read on public.return_items for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy return_items_ins on public.return_items for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
revoke update, delete on public.returns, public.return_items from authenticated;

-- ---------- money in and out of the shop: owner/manager only ----------
select app.policies('purchases',      'app.manager_shop_ids()', false, false, true);
select app.policies('purchase_items', 'app.manager_shop_ids()', false, false, true);
select app.policies('expenses',       'app.manager_shop_ids()', false, false, true);

create policy closings_read on public.cash_closings for select to authenticated using (shop_id in (select app.my_shop_ids()));
create policy closings_ins on public.cash_closings for insert to authenticated with check (shop_id in (select app.writable_shop_ids()));
revoke update, delete on public.cash_closings from authenticated;

create policy audit_read on public.audit_log for select to authenticated
  using (shop_id in (select app.owner_shop_ids()) or (select app.is_admin()));
