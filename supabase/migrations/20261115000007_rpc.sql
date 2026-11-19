-- Phase 1, step 7: the few server calls the app and the backend make.

-- Called by the app at the end of onboarding. Creates the shop, the owner membership and the
-- template's starter categories in one step.
create or replace function public.create_shop(
  p_name text, p_owner_name text, p_city text, p_template_key text default 'other', p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_shop uuid; t public.business_templates;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into t from public.business_templates
   where key = p_template_key and published order by version desc limit 1;
  if not found then raise exception 'unknown template %', p_template_key using errcode = 'P0001'; end if;
  if (select count(*) from public.memberships where user_id = auth.uid() and role = 'owner') >= 3 then
    raise exception 'A user can own at most 3 shops' using errcode = 'P0001';
  end if;

  insert into public.shops (name, owner_name, phone, city, template_key, template_version, settings, created_by)
  values (p_name, p_owner_name, p_phone, p_city, t.key, t.version,
          jsonb_build_object('barcode', coalesce((t.config ->> 'barcode')::boolean, false),
                             'expiry',  coalesce((t.config ->> 'expiry')::boolean, false)),
          auth.uid())
  returning id into v_shop;

  insert into public.memberships (shop_id, user_id, role) values (v_shop, auth.uid(), 'owner');
  insert into public.categories (shop_id, name, sort)
  select v_shop, x.name, (x.ord - 1)::smallint
  from jsonb_array_elements_text(coalesce(t.config -> 'starter', '[]'::jsonb)) with ordinality as x(name, ord);
  return v_shop;
end $$;

-- What the app caches after login. Works offline for up to 7 days from checked_at (enforced in the app).
create or replace function public.get_entitlement(p_shop uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.subscriptions; o public.entitlement_overrides;
begin
  if not (p_shop in (select app.my_shop_ids())) then
    raise exception 'not a member of this shop' using errcode = '42501';
  end if;
  select * into s from public.subscriptions where shop_id = p_shop;
  select * into o from public.entitlement_overrides where shop_id = p_shop;
  return jsonb_build_object(
    'shop_id', p_shop,
    'access', app.access(p_shop),
    'plan_id', app.effective_plan(p_shop),
    'limits', app.plan_limits(p_shop),
    'status', coalesce(s.status, 'none'),
    'store', s.store,
    'period_end', s.current_period_end,
    'grace_until', s.grace_until,
    'comp_until', o.comp_until,
    'suspended', coalesce(o.suspended, false),
    'checked_at', now());
end $$;
grant execute on function public.create_shop(text, text, text, text, text) to authenticated;
grant execute on function public.get_entitlement(uuid) to authenticated;

-- Called only by the backend (service_role) when Google Play or App Store sends a notification.
-- Idempotent: a repeated external_id is ignored. Out-of-order older renewals do not roll the period back.
create or replace function public.apply_subscription_event(
  p_store text, p_external_id text, p_shop uuid, p_event_type text, p_payload jsonb,
  p_product_id text, p_plan_id text, p_period text, p_status text,
  p_period_end timestamptz, p_grace_until timestamptz, p_auto_renew boolean, p_original_txn text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscription_events (store, external_id, shop_id, event_type, payload)
  values (p_store, p_external_id, p_shop, p_event_type, coalesce(p_payload, '{}'))
  on conflict (store, external_id) do nothing;
  if not found then return false; end if;

  insert into public.subscriptions as s (shop_id, store, product_id, plan_id, billing_period, status,
                                         current_period_end, grace_until, auto_renew, original_txn_id)
  values (p_shop, p_store, p_product_id, p_plan_id, p_period, p_status, p_period_end, p_grace_until, p_auto_renew, p_original_txn)
  on conflict (shop_id) do update set
    store = excluded.store, product_id = excluded.product_id, plan_id = excluded.plan_id,
    billing_period = excluded.billing_period, status = excluded.status,
    current_period_end = excluded.current_period_end, grace_until = excluded.grace_until,
    auto_renew = excluded.auto_renew, original_txn_id = excluded.original_txn_id
  where s.current_period_end is null
     or excluded.current_period_end is null
     or excluded.current_period_end >= s.current_period_end
     or excluded.status = 'refunded';   -- a refund always applies; a late old 'expired' must not undo a renewal
  return true;
end $$;
revoke all on function public.apply_subscription_event(text, text, uuid, text, jsonb, text, text, text, text, timestamptz, timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(text, text, uuid, text, jsonb, text, text, text, text, timestamptz, timestamptz, boolean, text) to service_role;
