# Database

Postgres on Supabase. Source: `supabase/migrations/` (forward-only), seed in `supabase/seed.sql`, tests in `supabase/tests/`.

## Tables

| Area | Tables |
|---|---|
| Reference | `plans`, `business_templates` |
| Tenancy | `shops`, `profiles`, `memberships`, `devices`, `platform_admins` |
| Billing | `subscriptions` (one per shop), `subscription_events` (raw, idempotent), `entitlement_overrides` |
| Catalog | `categories`, `products`, `product_costs`, `product_variants`, `product_barcodes` |
| Stock | `stock_movements` (append-only; `products.stock_qty` is a trigger-maintained cache) |
| Khata | `parties` (customer or supplier; `balance` is a cache), `ledger_entries` (append-only) |
| Selling | `sales`, `sale_items`, `sale_item_costs`, `payments`, `returns`, `return_items` |
| Money out | `purchases`, `purchase_items`, `expenses`, `cash_closings` |
| Audit | `audit_log` (append-only) |

Conventions: uuid ids made by the client, `shop_id` on every tenant table, money in bigint paisa, quantities `numeric(14,3)`, `deleted_at` tombstones instead of deletes, `updated_at` + `sync_seq` on mutable tables.

## Access model

- Roles: **owner > manager > cashier**. Permissions for cashiers live in `memberships.permissions`: `see_cost`, `edit_sales`, `give_discount`.
- Read: any member of the shop. Write: members of a shop whose access is `full`.
- Costs are in separate tables (`product_costs`, `sale_item_costs`), readable only with `see_cost`.
- Updates are column-level grants only. Clients cannot delete rows. Helper functions in schema `app` are not callable by app users.
- `app.access(shop)`: `full` for trial, active, cancelled-until-period-end, grace, complimentary and the first 2 days after signup; otherwise `read_only`. Suspension by an admin is `read_only`.
- Plan limits (`users`, `products`) are enforced by triggers.

## Server functions (the only way cashiers write money)

| Function | Does |
|---|---|
| `create_shop(...)` | Creates shop, owner membership, starter categories from the template. |
| `register_device(shop, device_id, name)` | Returns the device code (`D1`, `D2`) used in bill numbers. |
| `record_sale(jsonb)` | Validates, recomputes totals, writes sale, items, payments, stock and khata in one transaction. Idempotent on `id`. |
| `record_ledger_entry(...)` | Customer payment, or credit given (needs `edit_sales`). |
| `record_return(jsonb)` | Return against a sale; caps quantity; refunds cash, khata or exchange. Needs `edit_sales`. |
| `void_sale(shop, sale, reason)` | Cancels a sale, restores stock, reverses khata. Needs `edit_sales`. |
| `get_entitlement(shop)` | What the app caches: access, plan, limits, status. |
| `apply_subscription_event(...)` | Backend only (service role). Idempotent, ordered by event time. |

Owners and managers can still insert into the money tables directly (imports, corrections); cashiers cannot.

## Sync rule (client)

Pull rows with `sync_seq > cursor - 500`, upsert by id, advance the cursor to the highest `sync_seq` seen. Sequence numbers are issued when a statement runs, not when it commits, so the overlap window is required. Cache-only changes (`stock_qty`, `balance`) do not move the cursor.

## Adding a migration

1. Create `supabase/migrations/YYYYMMDDHHMMSS_short_name.sql`. Never edit an applied file.
2. New tenant table: `shop_id`, `unique (shop_id, id)`, composite FKs, RLS enabled, policies, `sync_seq` and a touch trigger if mutable, grants. The test suite fails if any public table lacks RLS.
3. Add tests to `supabase/tests/10_isolation.sql` (or a new numbered file).
4. Run `powershell -File supabase/tests/run-local.ps1`.
5. Describe the change in `CHANGELOG.md`.

## Known open items

Month partitioning past about 50M rows, UUIDv7 ids from the client, audit-log retention, a nightly check that cached balances equal ledger sums, a `pull_changes` function capped at the oldest open transaction.
