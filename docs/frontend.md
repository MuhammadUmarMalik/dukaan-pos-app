# Frontend (`apps/mobile`)

Expo SDK 58, expo-router, React 19, TypeScript strict, Zustand, `react-native-svg`. Runs on Android, iOS and web (web is for quick previews only).

## Structure

```
src/
  app/            routes only (expo-router)
    index.tsx       redirects to onboarding or tabs
    onboarding/     language, phone, shop, category, setup, plan
    (tabs)/         home, sell, items, khata, more (custom tab bar)
    cart.tsx pay.tsx receipt.tsx   sale flow, above the tabs
  ui/             Text, Row, Col, Card, Button, Chip, Badge, Field, Toggle, Avatar, Icon, TabBar, OnbShell
  theme/          tokens (light, dark), useTokens, useT, useRtl
  state/          settings (persisted), cart
  data/           seed.ts (sample data, same shapes as the database)
  lib/            money.ts (+ test)
```

## Design system

Tokens in `src/theme/tokens.ts` mirror `design/prototype.html`: cool graphite neutrals, one emerald accent, red/blue/green/yellow only for status. Radius: 10 inputs and chips, 14 buttons, 16 cards, 26 outer shell with a 20 inner plate (concentric). Fonts: Geist (English and all digits), Geist Mono (codes, receipts), Noto Naskh Arabic (Urdu). Icons: SVG paths in `src/ui/icons.tsx`, 24x24, stroke 1.75.

## Language and right-to-left

- `const t = useT(); t('Sell', 'فروخت')`. Every visible string has both.
- RTL is manual, not `I18nManager`, so switching language needs no restart. `Row` reverses in Urdu, `Text` sets alignment and writing direction and drops letter spacing (it breaks Arabic joining), `Icon flip` mirrors chevrons and back arrows. Use `start`/`end` in styles.
- Amounts use `Text num` (Geist, tabular digits) so they look the same in both languages. Wrap signs or percentages in a left-to-right mark (`‎`) when they sit inside Urdu text.

## State

Zustand stores. `settings` is persisted (language, theme, shop profile, category, flags, plan, device code, bill counter). `cart` holds the current sale and the last completed sale. Lists will move to the local database in the sync phase.

## Money

`src/lib/money.ts`: `rs(paisa)`, `lineTotal`, `totals`. Rounding happens once per line, the same rule as the database check `line_total = round(qty * unit_price)`.

## Adding a screen

1. Add a file under `src/app/...` (a route) and compose from `src/ui`.
2. Strings in both languages, tokens for colors, labels for icon buttons.
3. Check English and Urdu, light and dark, in `npx expo start --web`.
4. If it handles money or permissions, add a test next to the logic.

## Not built yet

Local database and sync, Supabase auth and data, product add/edit and barcode scan, khata ledger and payments, reports, printing (ESC/POS over Bluetooth), store purchases. Each needs a development build or Supabase and is tracked in `roadmap.md`.
