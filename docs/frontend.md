# Frontend (`apps/mobile`)

Expo SDK 58, expo-router, React 19, TypeScript strict, Zustand, `react-native-svg`. Runs on Android, iOS and web (web is for quick previews only).

## Structure

```
src/
  app/            routes only (expo-router)
    index.tsx       redirects to sign-in, onboarding or tabs
    onboarding/     language, account, shop, category, setup, plan, printer
    (tabs)/         home, sell, items, khata, more (custom tab bar)
    sale            cart, pay, split, weigh, held, receipt, returns
    products        product-form, product-detail, scan, stock, adjust-stock
    khata           ledger/[id], add-party, receive, reminder, statement
    buying          purchases, new-purchase, po
    money           expense, cash-close
    reports/        hub, sales, profit, purchases, expenses, customers, suppliers, stock, closing (day, week, month)
    shop            staff, add-staff, settings, printer-settings, catalog, loyalty, backup, help, alerts
    billing         subscription, pay-plan, paywall
  ui/             kit (Text, Row, Card, Button, Field...), parts (Header, Seg, Li, List, Stats, Keypad, Toast...), report (period picker, charts), icons, TabBar, OnbShell
  theme/          tokens (light, dark), useTokens, useT, useRtl
  state/          settings, products, khata, books (sales, held, purchases, expenses, returns, closings), cart, auth, scan
  data/           seed.ts (sample data and business templates)
  lib/            money, product, reports (periods, buckets, khata aging), books (khata signs, stock, weigh, reorder, cash), share (WhatsApp, call, share sheet), billing, auth, firebase
```

## Design system

Tokens in `src/theme/tokens.ts` mirror `design/prototype.html`: cool graphite neutrals, one emerald accent, red/blue/green/yellow only for status. Radius: 10 inputs and chips, 14 buttons, 16 cards, 26 outer shell with a 20 inner plate (concentric). Fonts: Geist (English and all digits), Geist Mono (codes, receipts), Noto Naskh Arabic (Urdu). Icons: SVG paths in `src/ui/icons.tsx`, 24x24, stroke 1.75.

## Language and right-to-left

- `const t = useT(); t('Sell', 'فروخت')`. Every visible string has both.
- RTL is manual, not `I18nManager`, so switching language needs no restart. `Row` reverses in Urdu, `Text` sets alignment and writing direction and drops letter spacing (it breaks Arabic joining), `Icon flip` mirrors chevrons and back arrows. Use `start`/`end` in styles.
- Amounts use `Text num` (Geist, tabular digits) so they look the same in both languages. Wrap signs or percentages in a left-to-right mark (`‎`) when they sit inside Urdu text.

## State

Zustand stores, persisted on the phone: `settings` (language, theme, shop, plan, switches, receipt design, staff, printer name, local subscription status), `products` (items and an append-only movement log), `khata` (customers and suppliers with append-only entries; balance is the sum), `books` (sales history, held bills, purchases, expenses, returns, day closings). `cart` holds the current sale. In the sync phase money writes become Cloud Function calls (RULES.md #4) and these stores become caches.

## Money

`src/lib/money.ts`: `rs(paisa)`, `lineTotal`, `totals`. Rounding happens once per line, the same rule as the database check `line_total = round(qty * unit_price)`.

## Adding a screen

1. Add a file under `src/app/...` (a route) and compose from `src/ui`.
2. Strings in both languages, tokens for colors, labels for icon buttons.
3. Check English and Urdu, light and dark, in `npx expo start --web`.
4. If it handles money or permissions, add a test next to the logic.

## Works on the phone only, for now

Every prototype screen is built. These parts finish on another app or need the backend or a development build, and the screen says so instead of pretending:

- **Printing**: the printer name is saved; Bluetooth search and ESC/POS printing need a native module.
- **Store purchases**: `lib/billing.ts` returns `unavailable`; Google Play Billing and StoreKit come with the billing phase. Nothing is ever marked paid on the phone. Subscription status is local and starts as a 14-day trial.
- **WhatsApp, calls, exports**: real, through `wa.me`, `tel:` and the share sheet (CSV text, no PDF yet).
- **Online catalog, cloud backup, staff sign-in, app lock PIN**: switches are saved; the behaviour needs Firebase.
- **Reports, cash closing, alerts**: computed from what this phone recorded (last 500 sales).

Not built: local database and sync, Firestore rules and Cloud Functions, admin panel (`apps/admin`).
