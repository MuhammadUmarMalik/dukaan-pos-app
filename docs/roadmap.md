# POS SaaS (Shopkeeper Mobile App + Super-Admin Panel) — Plan v1

> **Backend changed:** Firebase (Auth, Firestore, Cloud Functions) replaces Supabase Postgres, see [ADR 0007](decisions/0007-firebase.md). Sections below that mention Supabase, Postgres, RLS or SQL describe the original plan and are kept for history; the app-side plans (offline-first, entitlements, store billing, templates) still apply.

## 1. What we sell
Monthly/yearly subscription to local shopkeepers (Pakistan-style: Urdu + English, khata culture, cash-heavy, flaky internet).
Each shop = one tenant. Shopkeeper app (React Native, Android first) + Super-admin web panel (for you).

## 2. Scope (confirmed)
**Core:** sales/POS, purchases, customer khata, supplier ledger, product CRUD, barcode scan add/sell, 58mm Bluetooth receipt print, stock, reports, ledgers.
**Selling:** WhatsApp bill + khata reminders, discounts/returns/hold bills, multi-payment (cash/JazzCash/Easypaisa/bank/part-khata), loyalty points + customer SMS.
**Management:** low-stock + expiry alerts, staff roles/permissions + audit log, expenses + daily cash closing.
**SaaS extras:** Urdu/English with RTL, online catalog/order link, supplier purchase orders + reorder suggestions, backup + PDF/Excel export.
**Admin panel:** tenants list, plans, subscription/payment verification, trial/suspend, usage stats, support notes.
**Not now (non-goals):** multi-branch, accounting-grade GST/FBR filing, marketplace, hardware POS terminals.

## 3. Architecture (multi-tenant)
- One Postgres DB, shared schema; every table has `shop_id`; Row-Level Security enforces isolation (JWT carries `shop_id` + `role`).
- Supabase (Auth, Postgres, Storage) + thin Node.js/Express API (see section 12). Boring on purpose.
- Offline-first app: local SQLite (WatermelonDB), outbox queue, sync on reconnect; ledger rows are append-only (no edits, only reversing entries) so khata never goes wrong on conflict.
- Plans/feature flags table: `plans`, `subscriptions`, `entitlements` (staff limit, products limit, reports, catalog link). App reads entitlements at login, caches offline with grace period.
- Printing: ESC/POS over Bluetooth (58mm, 32 chars/line), Urdu receipts rendered as bitmap.
- Money: integer paisas, never floats.

## 4. Data model (core tables)
shops, users, memberships(role), plans, subscriptions, products, categories, barcodes, stock_movements, parties(customer|supplier), ledger_entries, sales, sale_items, payments, purchases, purchase_items, returns, expenses, cash_closings, loyalty_ledger, audit_log, catalog_orders.

## 5. Shopkeeper app screens (design list)
1. Onboarding: language, phone OTP, shop details, **shop category picker + auto-setup review (see section 9)**, plan/trial, printer pairing, first products
2. Home dashboard: today sales, cash, khata due, low stock, quick actions
3. POS/New sale: scan/search, cart, discount, hold bill, payment split, print/WhatsApp
4. Products: list, add/edit (scan barcode, photo), categories, stock adjust, expiry
5. Khata: customers, ledger, add payment, reminder via WhatsApp/SMS
6. Suppliers + Purchases: purchase entry, PO, payables, reorder suggestions
7. Stock: levels, low/expiry alerts, movements
8. Returns, Expenses, Daily cash closing
9. Reports: sales, profit, stock, khata aging, expenses, export PDF/Excel
10. Staff & permissions, audit log
11. Catalog link + incoming orders
12. Settings: receipt designer, printer, language, backup, subscription/billing

## 6. Super-admin panel screens
Login, tenants list/detail, plans & pricing, subscriptions/payments queue (verify JazzCash/Easypaisa slip), trial/suspend, usage dashboard, support notes.

## 7. Phases
| Phase | Output |
|---|---|
| 0 | Design system + clickable UI prototype (shopkeeper app + admin panel) DONE (design/prototype.html) |
| 1 | Backend: schema, RLS, auth, entitlements. Schema, RLS, entitlement and store-event functions DONE and tested (supabase/). Express API still to build. |
| 2 | MVP app: POS, products+scan, print, stock, khata, basic reports (offline) |
| 3 | Purchases/suppliers, returns, expenses, cash closing, staff roles |
| 4 | WhatsApp/SMS, loyalty, catalog link, export/backup |
| 5 | Admin panel + subscription billing, pilot with 5-10 shops |

## 8. Design direction (Phase 0)
Big thumb-friendly buttons, high contrast, Urdu-first RTL, icon + text labels, works one-handed, minimal typing (scan, tap, quick amounts), green/teal brand, light theme with dark option.

## 9. Business-type engine (works for ANY local shop)
One app, one codebase. The shop's **category** picks a **template** (a JSON config, not code). Onboarding applies it; shopkeeper can still toggle every option later in Settings.

**Onboarding flow:** Language (Urdu/English) -> Phone OTP -> Shop name/city/logo -> **Pick category** (big icon grid, search, "Other") -> Review auto-setup ("We set up X for you", toggles) -> Choose plan / start trial -> Pair printer (skippable) -> Add first products (scan / quick-add sample list for category / import) -> Home.

**Template controls:** product fields, units, sale mode, default categories+sample products, enabled modules, receipt layout, report widgets, home quick actions, alerts.

| Category | Special setup |
|---|---|
| Grocery / General | Barcode-first, units (pcs, kg, dozen, carton), low-stock, supplier POs |
| Bakery / Sweets | Sell by weight or piece, made-daily items, no barcode needed, quick-tap item grid with photos |
| Milk / Dairy shop | Litre/kg, daily customers with fixed quantity, monthly khata/auto daily entry, milk-per-day report |
| Shoes / Garments | Variants (size/colour), stock per variant, barcode per variant, exchange/return heavy, seasonal discount |
| Fruit / Vegetables | Weight-based, price changes daily (quick rate update screen), wastage entry |
| Pharmacy / Medical | Batch + expiry, strip/box units, expiry alerts first |
| Mobile / Electronics | IMEI/serial, warranty, repair/udhaar |
| Hardware / Paint / Cosmetics etc. | Units + variants, khata for contractors |
| Restaurant / Fast food / Tea stall | Menu items, quick tap, table/token no. (later phase) |
| Other | Minimal general template, everything toggleable |

**How it's built (no per-business code):**
- `business_templates` (versioned JSON, editable from admin panel -> add a new business type without app release).
- Core tables stay the same; product gets `unit`, `variant` rows (optional), `attributes jsonb` (batch, expiry, IMEI, etc.).
- UI renders fields/modules from the template + shop's feature flags.
- Template is cached in the app, works offline.

## 10. Scalable + cost-optimized design
**Principle:** keep infra shared and tiny; push work to the phone; pay only for what's metered.

| Area | Decision | Why it saves money |
|---|---|---|
| Backend | Single Supabase project, shared schema (pooled multi-tenancy) | No per-shop servers; start on Free/Pro (~$25/mo) for hundreds of shops |
| Sync | Offline-first, delta sync (changes since last sync), batched | Far fewer API calls and DB reads; app is fast on bad internet |
| DB | `shop_id` leading column in every index; RLS; money as integers; archive old sales to cold storage (>2 yrs) | Fast queries as data grows; small DB |
| Images | Compress/resize on device (WebP, ~30-60KB), lazy upload on Wi-Fi, store product photos once per shop | Storage/bandwidth stay near zero |
| Barcode | On-device scanner (Google ML Kit / mobile_scanner) | Free, no server |
| Printing | Bluetooth ESC/POS from phone | Free, no cloud print |
| WhatsApp | `wa.me` click-to-chat share (receipt text/PDF + khata reminder) | Free, no WhatsApp Business API fees; API only as later paid add-on |
| SMS | Paid add-on, credits bought by shop (pass cost through) | You don't absorb SMS cost |
| Reports | Computed on-device from local data for the shop; heavy/exports via one Edge Function; nightly rollup table for dashboards | No expensive analytics stack |
| Catalog link | Static page + product JSON from CDN cache | Near-zero cost per visit |
| Payments | In-app subscriptions through Google Play Billing and Apple In-App Purchase (section 13) | Required by store rules; stores charge ~15% and handle cards, tax and refunds |
| Plans | Free trial -> Basic / Standard / Pro gated by entitlements (staff, products, exports, catalog, SMS credits) | Heavy features only on paying tiers |
| Monitoring | Sentry free tier + Supabase logs | No extra tooling bill |

**Rough cost model (to validate):** infra ~ $25-50/mo up to a few thousand active shops; cost/shop/month is cents. Charge e.g. PKR 500-1500/mo -> very high margin.

**Scale path (when needed, not before):** Supabase Pro -> bigger compute + read replica -> partition big tables by shop_id hash -> move heavy tenants to dedicated DB. No rewrite required because `shop_id` is everywhere from day one.

## 11. Open items (my calls, change if wrong)
- React Native (Expo dev build) + Supabase Postgres + Express API; Android first (stack details: section 12)
- Subscriptions are bought only through Google Play and the App Store (section 13). No in-app JazzCash/Easypaisa/slip flow
- Pilot shop types: grocery + bakery + milk + shoes (to prove the template engine)
- Restaurant/table management deferred to a later phase

## 12. Tech stack (decided)
| Layer | Choice | Why / rejected |
|---|---|---|
| Mobile | **React Native + TypeScript, Expo with dev builds** (not Expo Go) | Bluetooth printer + barcode need native modules; Expo dev build + EAS keeps builds easy |
| Navigation / UI | Expo Router, RTL via `I18nManager`, i18next (ur/en), NativeWind or Tamagui | Urdu RTL from day one |
| State | **Zustand** (+ `persist` on MMKV) | Stores below |
| Local DB (offline) | **WatermelonDB** (SQLite, built-in sync protocol) | **Redis cannot run on a phone.** Alternative: op-sqlite + Drizzle |
| Local cache / settings | **react-native-mmkv** | Fast key-value: token, template, entitlements, UI prefs (the "Redis" of the phone) |
| Database | **Supabase Postgres** (RLS multi-tenant) | **Not Firestore**: per-read billing, no joins/aggregates, poor for ledgers/reports |
| Auth | Supabase Auth (phone OTP) | Firebase Auth is the alternative; one vendor is simpler, JWT carries `shop_id` + `role` |
| Firebase (kept small) | FCM push + Crashlytics/Analytics only | Free tier, no DB lock-in |
| Backend API | **Node.js + Express + TypeScript** (zod validation) | Handles sync endpoints, subscriptions/billing, admin panel API, exports, SMS credits. **Not Adonis**: Supabase already gives auth/ORM/migrations, so Adonis would duplicate it |
| Server cache/queue | **Upstash Redis** (serverless, pay-per-request), added only when needed | Rate limiting, OTP throttle, job queue (BullMQ). Phase 4+, not MVP |
| Hosting | Express on Railway/Fly.io/VPS (~$5-10/mo) | Cheap, one small instance |
| Admin panel | React + Vite + shadcn/ui | Talks to Express API |
| Printing / scan | react-native-thermal-receipt-printer (ESC/POS), vision-camera + ML Kit barcode | Free, on-device |

### Zustand stores (one per feature, small, no cross-imports; data lives in WatermelonDB, stores hold UI/session state)
- `authStore` - session, user, role, permissions
- `shopStore` - shop profile, business template, feature flags
- `entitlementStore` - plan, limits, trial/grace expiry
- `settingsStore` - language/RTL, theme, receipt options
- `cartStore` - current sale lines, discount, customer, held bills
- `paymentStore` - split payments, change due
- `productStore` - filters, search, selected, scan draft
- `stockStore` - alert thresholds, adjust drafts
- `khataStore` - selected party, filters, reminder drafts
- `purchaseStore` - purchase/PO drafts
- `expenseStore` / `cashStore` - expense draft, daily closing
- `reportStore` - date range, filters
- `printerStore` - paired device, connection status, print queue
- `syncStore` - online state, pending outbox count, last sync, errors
- `staffStore`, `catalogStore`, `loyaltyStore` - screen/draft state
Rule: lists come from WatermelonDB observables, not Zustand; Zustand = ephemeral UI state + session + small persisted prefs.

### Repo layout (monorepo)
`apps/mobile`, `apps/admin`, `apps/api`, `packages/shared` (types, zod schemas, business templates, money utils).


## 13. Subscriptions through Google Play and the App Store (decided)
**Rule:** the shop owner buys the plan inside the app with the store's native purchase sheet. Apple requires In-App Purchase for subscriptions to digital services sold inside an iOS app, and Google Play requires Play Billing. No manual slip or outside payment prompt in the app.

**Products:** 3 plans x monthly/yearly = 6 subscription products per store, in one subscription group (Apple) / one subscription with base plans (Google). 14-day free trial is an introductory offer set in the stores, so the store holds a payment method from day one.

**Backend (Express + Supabase):**
- Link purchase to shop: send `shop_id` as Apple `appAccountToken` and Google `obfuscatedAccountId` at purchase time.
- Verify and listen: Google Play Developer API + Real-time Developer Notifications (Pub/Sub); Apple App Store Server API + Server Notifications V2. Option: RevenueCat in front of both (less code, free until a revenue threshold, then a % fee). Decide at Phase 5.
- `subscriptions` table: shop_id, store, product_id, status, period_end, grace_until, original_txn_id. App reads entitlement from our server, caches it in MMKV, works offline up to 7 days after last verification.
- Status model: trial, active, grace (billing retry, full access), hold (read-only), cancelled (access until period end), expired (read-only paywall), refunded.
- Admin override (server side): complimentary days, suspend for policy. Admin cannot mark a shop "paid".

**Required screens (in prototype):** store purchase sheet (Android and iOS), pending/declined/cancelled results, Subscription screen with Manage in store, Change plan, Restore purchases, Terms and Privacy links; billing banners on Home; paywall when expired; admin Subscriptions feed.

**Edge cases to build:** restore purchases, reinstall on new phone, plan upgrade/downgrade (store handles proration), refund (revoke), shop bought on Android and opened on iOS (entitlement is per shop, so it works), staff cannot buy (owner only), two owners buying twice (block if shop already active).

**Cost:** about 15% to the stores (Apple Small Business Program and Google reduced rate under USD 1M). Plan prices must include it. Example: Standard at Rs 900 nets about Rs 765.

**Risks to verify before build:**
- Google Play: confirm a Pakistan merchant profile can sell subscriptions today in Play Console, and which payment methods Pakistani shopkeepers can actually use (cards, carrier billing, gift cards). Carrier billing has been interrupted before.
- Apple: confirm PKR price points and that shopkeepers have Apple IDs with a payment method. Most shops are Android, so Android is the launch platform.
- Apple review: no links or mentions of cheaper outside payment in the app. Business-tool SaaS still needs IAP when sold inside the app.
- If store billing proves hard for a segment, the fallback is selling through your website and logging in with the same account. The app must not prompt for it (iOS), so confirm policy at that point.

### 13.1 Store rules check (Nov 2026)
**Confirmed from Apple's App Review Guidelines:** 3.1.1 says unlocking features or functionality, with subscriptions as the example, must use in-app purchase, and apps cannot use their own mechanisms. 3.1.2(a) lists SaaS as a valid auto-renewable subscription. The exceptions (3.1.3) do not fit us: reader apps are for magazines, books, audio, music and video only, and the enterprise exception (3.1.3(c)) covers apps sold directly to organizations for their employees; consumer and single-user sales must use IAP. Outside the US storefront we cannot point users to other payment methods from inside the app. Decision: sell only through IAP on iOS.

**Not confirmed (verify in the consoles, third-party sources only):**
- Google Play: Pakistan merchant profile and subscription sales are reported as supported, with payouts by USD wire (reported minimum USD 100). The official Google country table could not be read. Service fee on subscriptions is reported as 10%, 15% or other depending on source and region. Confirm the exact rate in Play Console fee tables.
- Pakistani shopkeepers: which payment methods work in Play Store for them (cards, carrier billing, gift cards). Carrier billing has been interrupted before.
- Apple: PKR pricing is reported as supported with Apple tier charts. Confirm available price points in App Store Connect and enroll in the Small Business Program.
- Price fit: Standard at Rs 900 may land between store price points. Pick the nearest point and show the store price in the app.

**Next actions:** (1) create the Play Console account and open the Payments profile, (2) create Apple Developer account, banking and tax, (3) create one test subscription in each store, (4) run a real sandbox purchase on a Pakistani SIM before Phase 5 is scoped.


## 14. Phase 1 status (Nov 2026)
Built in `supabase/`: 9 migrations, seed (plans, 10 business templates), 110-check test (`supabase/tests/run-local.ps1`, runs on a throwaway Postgres, no Supabase needed).
Decisions: tenancy by `shop_id` + composite foreign keys (cross-shop references impossible); roles owner/manager/cashier; cost prices in separate tables gated by a permission; ledger and stock movements append-only with cached balances kept by triggers; write access follows the subscription (trial/active/grace full, hold/expired read-only) enforced in the database; store events applied idempotently and never roll a renewal back.
Not done yet: Express API (store webhooks, admin API), running the migrations on a real Supabase project, sync endpoint, generated TypeScript types.

### 14.1 Hardening after review (Nov 2026)
Two independent reviews (schema, security) found no cross-shop leak. Fixed in migrations 08 and 09, all covered by tests:
- **Sync:** every synced table has a `sync_seq` (monotonic). Client rule: pull `sync_seq > cursor - 500`, upsert by id, advance cursor. Cache-only updates (stock_qty, balance) no longer bump the cursor. Clients cannot hard delete; tombstones via `deleted_at`. Devices get server-assigned codes (`D1`, `D2`), bill numbers look like `D2-000187`.
- **Money writes go through server functions:** `record_sale`, `record_ledger_entry`, `record_return`, `void_sale`, `register_device`. They recompute totals, check price/discount/credit-limit permissions, are idempotent on id, and write sale + items + payments + stock + khata in one transaction. Cashiers have no direct insert on sales, ledger, stock, returns or cash closings (owners/managers keep direct insert for imports).
- **Integrity:** sign rules per ledger kind, one reversal per entry, stock sign per reason, sale total = subtotal - discount, line total = qty x price, bill number format, a customer entry must hit a customer.
- **Server-set columns:** `created_by` always from the session; non-managers cannot backdate more than 7 days.
- **Grants:** column-level UPDATE only, no client DELETE, `app.*` helpers not callable by app users, default privileges revoked from anon, tests assert every public table has RLS.
- **Audit:** price, cost, credit limit, role/permission, and any sale change; audit log is append-only and owner-readable.
- **Subscriptions:** events ordered by their own timestamp; unmapped purchases keep an audit row.
Decisions to carry into Phase 2: the app must call these functions (not insert into sales tables) for cashier flows; the prototype's cash-closing screen is manager-only in the database; "credit given" and returns need the cashier `edit_sales` permission.
Still open (from review, not blocking): month partitioning of big tables past ~50M rows, UUIDv7 ids from the client, audit-log retention, nightly check that cached balances equal ledger sums, a `pull_changes` function that caps at the oldest open transaction.
