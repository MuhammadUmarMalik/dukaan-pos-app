-- Phase 1, step 2: global reference data, tenants (shops), members, store subscriptions.

create table public.plans (
  id             text primary key,                       -- basic | standard | pro
  name           text not null,
  price_pkr      integer not null check (price_pkr >= 0), -- display price; the store sets the real one
  limits         jsonb not null default '{}',            -- {"users":3,"products":null,...} null = unlimited
  store_products jsonb not null default '{}',            -- {"google":"dukaan_basic_monthly","apple":"..."}
  sort           smallint not null default 0,
  active         boolean not null default true
);

-- Business templates drive onboarding and the app UI. Edited from the admin panel, versioned.
create table public.business_templates (
  key        text not null,
  version    integer not null default 1,
  name       text not null,
  name_ur    text,
  config     jsonb not null,
  published  boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (key, version)
);

create table public.shops (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 1 and 120),
  owner_name       text,
  phone            text,
  city             text,
  address          text,
  template_key     text not null default 'other',
  template_version integer not null default 1,
  settings         jsonb not null default '{}',
  -- Full access for a short window after sign-up so onboarding, pending purchases and offline
  -- verification never lock a new shop out.
  setup_until      timestamptz not null default (now() + interval '2 days'),
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (template_key, template_version) references public.business_templates (key, version)
);
create trigger shops_touch before update on public.shops for each row execute function app.touch();

create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  locale     text not null default 'en' check (locale in ('en', 'ur')),
  created_at timestamptz not null default now()
);

create table public.memberships (
  shop_id     uuid not null references public.shops (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('owner', 'manager', 'cashier')),
  -- cashier toggles shown in the app: {"see_cost":false,"edit_sales":false,"give_discount":true}
  permissions jsonb not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create unique index memberships_one_owner on public.memberships (shop_id) where role = 'owner' and active;
create index memberships_user on public.memberships (user_id) where active;
create trigger memberships_touch before update on public.memberships for each row execute function app.touch();

-- One current subscription per shop, written only by the backend from Google Play / App Store events.
create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null unique references public.shops (id) on delete cascade,
  store              text not null check (store in ('google', 'apple')),
  product_id         text not null,
  plan_id            text not null references public.plans (id),
  billing_period     text not null check (billing_period in ('monthly', 'yearly')),
  status             text not null check (status in ('trial', 'active', 'grace', 'hold', 'cancelled', 'expired', 'refunded')),
  current_period_end timestamptz,
  grace_until        timestamptz,
  auto_renew         boolean not null default true,
  original_txn_id    text not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (store, original_txn_id)
);
create trigger subscriptions_touch before update on public.subscriptions for each row execute function app.touch();

-- Raw store notifications. unique (store, external_id) makes processing idempotent.
create table public.subscription_events (
  id          uuid primary key default gen_random_uuid(),
  store       text not null check (store in ('google', 'apple')),
  external_id text not null,
  shop_id     uuid references public.shops (id) on delete set null,
  event_type  text not null,
  payload     jsonb not null default '{}',
  received_at timestamptz not null default now(),
  unique (store, external_id)
);
create index subscription_events_shop on public.subscription_events (shop_id, received_at desc);

-- Admin-granted access that does not come from a store purchase.
create table public.entitlement_overrides (
  shop_id    uuid primary key references public.shops (id) on delete cascade,
  comp_until timestamptz,                   -- complimentary access until this time
  plan_id    text references public.plans (id), -- plan limits during complimentary access
  suspended  boolean not null default false, -- policy suspension: read-only
  note       text,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
