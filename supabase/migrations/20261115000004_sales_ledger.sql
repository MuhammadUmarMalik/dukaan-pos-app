-- Phase 1, step 4: parties, khata ledger, sales, returns, purchases, expenses, cash closing, audit.

create table public.parties (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  kind         text not null check (kind in ('customer', 'supplier')),
  name         text not null check (char_length(name) between 1 and 200),
  phone        text,
  area         text,
  credit_limit bigint check (credit_limit >= 0),
  -- Cached sum of ledger_entries.amount, maintained by trigger.
  -- customer: > 0 means the customer owes the shop. supplier: > 0 means the shop owes the supplier.
  balance      bigint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (shop_id, id)
);
create index parties_sync on public.parties (shop_id, updated_at);
create index parties_kind on public.parties (shop_id, kind) where deleted_at is null;
create trigger parties_touch before update on public.parties for each row execute function app.touch();

-- The khata. Append-only: a mistake is fixed with a reversing entry (reversed_of), never an edit.
create table public.ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  party_id    uuid not null,
  amount      bigint not null check (amount <> 0),  -- + increases party balance, - decreases it
  kind        text not null check (kind in ('sale', 'payment', 'credit', 'purchase', 'supplier_payment', 'adjust', 'reversal')),
  mode        text check (mode in ('cash', 'jazzcash', 'easypaisa', 'bank')),
  ref_type    text,
  ref_id      uuid,
  reversed_of uuid,
  note        text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (shop_id, id),
  foreign key (shop_id, party_id) references public.parties (shop_id, id),
  foreign key (shop_id, reversed_of) references public.ledger_entries (shop_id, id)
);
create index ledger_party on public.ledger_entries (shop_id, party_id, created_at desc);
create index ledger_sync on public.ledger_entries (shop_id, created_at);

create table public.sales (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  -- Assigned on the device so it works offline, for example 'A2-000187' (device code + counter).
  bill_no    text not null,
  party_id   uuid,
  subtotal   bigint not null check (subtotal >= 0),
  discount   bigint not null default 0 check (discount >= 0),
  total      bigint not null check (total >= 0),
  status     text not null default 'completed' check (status in ('completed', 'voided')),
  sold_at    timestamptz not null default now(),
  device_id  text,
  note       text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, id),
  unique (shop_id, bill_no),
  foreign key (shop_id, party_id) references public.parties (shop_id, id)
);
create index sales_day on public.sales (shop_id, sold_at desc);
create index sales_party on public.sales (shop_id, party_id, sold_at desc) where party_id is not null;
create index sales_sync on public.sales (shop_id, updated_at);
create trigger sales_touch before update on public.sales for each row execute function app.touch();

create table public.sale_items (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  sale_id    uuid not null,
  product_id uuid not null,
  variant_id uuid,
  name       text not null,                 -- snapshot, so history survives renames
  qty        numeric(14,3) not null check (qty > 0),
  unit_price bigint not null check (unit_price >= 0),
  line_total bigint not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, id),
  foreign key (shop_id, sale_id) references public.sales (shop_id, id) on delete cascade,
  foreign key (shop_id, product_id) references public.products (shop_id, id),
  foreign key (shop_id, variant_id) references public.product_variants (shop_id, id)
);
create index sale_items_sale on public.sale_items (shop_id, sale_id);
create index sale_items_product on public.sale_items (shop_id, product_id);
create trigger sale_items_touch before update on public.sale_items for each row execute function app.touch();

-- Filled by a trigger from product_costs, so cashiers never need to read costs to sell.
create table public.sale_item_costs (
  shop_id      uuid not null,
  sale_item_id uuid not null,
  unit_cost    bigint not null check (unit_cost >= 0),
  primary key (shop_id, sale_item_id),
  foreign key (shop_id, sale_item_id) references public.sale_items (shop_id, id) on delete cascade
);

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  sale_id    uuid,
  party_id   uuid,
  mode       text not null check (mode in ('cash', 'jazzcash', 'easypaisa', 'bank', 'khata')),
  amount     bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (shop_id, sale_id) references public.sales (shop_id, id) on delete cascade,
  foreign key (shop_id, party_id) references public.parties (shop_id, id)
);
create index payments_sale on public.payments (shop_id, sale_id);
create index payments_day on public.payments (shop_id, created_at desc);
create trigger payments_touch before update on public.payments for each row execute function app.touch();

create table public.returns (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  sale_id     uuid not null,
  party_id    uuid,
  refund_mode text not null check (refund_mode in ('cash', 'khata', 'exchange')),
  total       bigint not null check (total >= 0),
  reason      text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (shop_id, id),
  foreign key (shop_id, sale_id) references public.sales (shop_id, id),
  foreign key (shop_id, party_id) references public.parties (shop_id, id)
);
create trigger returns_touch before update on public.returns for each row execute function app.touch();

create table public.return_items (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  return_id    uuid not null,
  sale_item_id uuid not null,
  product_id   uuid not null,
  qty          numeric(14,3) not null check (qty > 0),
  amount       bigint not null check (amount >= 0),
  foreign key (shop_id, return_id) references public.returns (shop_id, id) on delete cascade,
  foreign key (shop_id, sale_item_id) references public.sale_items (shop_id, id),
  foreign key (shop_id, product_id) references public.products (shop_id, id)
);
create index return_items_return on public.return_items (shop_id, return_id);

create table public.purchases (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  supplier_id  uuid,
  ref_no       text,
  total        bigint not null check (total >= 0),
  paid         bigint not null default 0 check (paid >= 0),
  purchased_at date not null default current_date,
  note         text,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (shop_id, id),
  foreign key (shop_id, supplier_id) references public.parties (shop_id, id)
);
create index purchases_day on public.purchases (shop_id, purchased_at desc);
create trigger purchases_touch before update on public.purchases for each row execute function app.touch();

create table public.purchase_items (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  purchase_id uuid not null,
  product_id  uuid not null,
  qty         numeric(14,3) not null check (qty > 0),
  unit_cost   bigint not null check (unit_cost >= 0),
  foreign key (shop_id, purchase_id) references public.purchases (shop_id, id) on delete cascade,
  foreign key (shop_id, product_id) references public.products (shop_id, id)
);
create index purchase_items_purchase on public.purchase_items (shop_id, purchase_id);

create table public.expenses (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  category   text not null,
  amount     bigint not null check (amount > 0),
  paid_from  text not null default 'cash' check (paid_from in ('cash', 'bank')),
  note       text,
  spent_at   date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_day on public.expenses (shop_id, spent_at desc);
create trigger expenses_touch before update on public.expenses for each row execute function app.touch();

create table public.cash_closings (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  day        date not null,
  opening    bigint not null,
  expected   bigint not null,
  counted    bigint not null,
  closed_by  uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (shop_id, day)
);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  shop_id    uuid,
  user_id    uuid,
  table_name text not null,
  row_id     uuid,
  action     text not null,
  old_row    jsonb,
  new_row    jsonb,
  at         timestamptz not null default now()
);
create index audit_log_shop on public.audit_log (shop_id, at desc);
