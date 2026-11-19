-- Phase 1, step 3: products, barcodes, variants, stock.
-- Cost prices live in their own tables so a cashier without the "see cost" permission cannot read them.

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  name       text not null,
  name_ur    text,
  sort       smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shop_id, id)
);
create index categories_sync on public.categories (shop_id, updated_at);
create trigger categories_touch before update on public.categories for each row execute function app.touch();

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  category_id uuid,
  name        text not null check (char_length(name) between 1 and 200),
  name_ur     text,
  unit        text not null default 'pcs',
  sale_price  bigint not null check (sale_price >= 0),
  track_stock boolean not null default true,
  stock_qty   numeric(14,3) not null default 0,   -- cached sum of stock_movements, maintained by trigger
  min_stock   numeric(14,3) not null default 0,
  attributes  jsonb not null default '{}',         -- batch/expiry/IMEI flags etc, driven by the template
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (shop_id, id),
  foreign key (shop_id, category_id) references public.categories (shop_id, id)
);
create index products_sync on public.products (shop_id, updated_at);
create index products_name on public.products (shop_id, lower(name)) where deleted_at is null;
create trigger products_touch before update on public.products for each row execute function app.touch();

create table public.product_costs (
  shop_id    uuid not null,
  product_id uuid not null,
  cost_price bigint not null check (cost_price >= 0),
  updated_at timestamptz not null default now(),
  primary key (shop_id, product_id),
  foreign key (shop_id, product_id) references public.products (shop_id, id) on delete cascade
);
create trigger product_costs_touch before update on public.product_costs for each row execute function app.touch();

create table public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  product_id uuid not null,
  sku        text,
  attributes jsonb not null default '{}',     -- {"size":"42","colour":"black"}
  sale_price bigint check (sale_price >= 0),  -- null = use the product price
  stock_qty  numeric(14,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shop_id, id),
  foreign key (shop_id, product_id) references public.products (shop_id, id) on delete cascade
);
create index product_variants_product on public.product_variants (shop_id, product_id);
create trigger product_variants_touch before update on public.product_variants for each row execute function app.touch();

create table public.product_barcodes (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  barcode    text not null check (char_length(barcode) between 4 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, barcode),
  foreign key (shop_id, product_id) references public.products (shop_id, id) on delete cascade,
  foreign key (shop_id, variant_id) references public.product_variants (shop_id, id) on delete cascade
);
create index product_barcodes_product on public.product_barcodes (shop_id, product_id);
create trigger product_barcodes_touch before update on public.product_barcodes for each row execute function app.touch();

-- Append-only. Positive qty adds stock, negative removes. Negative stock is allowed on purpose:
-- shopkeepers sell before they record the delivery.
create table public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  product_id  uuid not null,
  variant_id  uuid,
  qty         numeric(14,3) not null check (qty <> 0),
  reason      text not null check (reason in ('opening', 'sale', 'purchase', 'return', 'adjust', 'damage', 'expiry')),
  ref_type    text,
  ref_id      uuid,
  batch_no    text,
  expiry_date date,
  note        text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  foreign key (shop_id, product_id) references public.products (shop_id, id),
  foreign key (shop_id, variant_id) references public.product_variants (shop_id, id)
);
create index stock_movements_product on public.stock_movements (shop_id, product_id, created_at desc);
create index stock_movements_expiry on public.stock_movements (shop_id, expiry_date) where expiry_date is not null;
create index stock_movements_sync on public.stock_movements (shop_id, created_at);
