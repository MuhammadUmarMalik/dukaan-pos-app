# Rules

Hard rules for everyone who changes this repo, people and AI agents alike. If a change needs to break one, write an ADR in `docs/decisions/` first.

## Money and data

1. **Money is integer paisa** (Rs 1 = 100). Never floats, never rupees as decimals. Format only at the screen edge with `rs()` from `apps/mobile/src/lib/money.ts`.
2. **Every tenant table has `shop_id`** and row level security. Child tables use composite foreign keys `(shop_id, parent_id)` so a row can never point at another shop.
3. **Ledger and stock are append-only.** Fix mistakes with a reversing row, never an UPDATE or DELETE. Balances and stock counts are caches kept by triggers.
4. **Cashiers write money through server functions** (`record_sale`, `record_ledger_entry`, `record_return`, `void_sale`). The app never inserts into `sales`, `payments`, `ledger_entries`, `stock_movements` or `returns` directly.
5. **Applied migrations are never edited.** Add a new timestamped file in `supabase/migrations/`. Migrations are forward-only.
6. **The service-role key never ships in the app.** Only the public anon URL and key go in `EXPO_PUBLIC_*` variables. Real keys live in secret stores, never in git.
7. **Clients cannot delete rows.** Removal is `deleted_at`. Synced tables carry `sync_seq`.

## Billing

8. **Plans are bought only through Google Play Billing and Apple In-App Purchase.** No in-app JazzCash, Easypaisa or slip upload flow. No in-app text that points to outside payment on iOS.
9. Access follows the store subscription: trial, active and grace are full; hold, expired and refunded are read-only. The database enforces it, the UI only reflects it.

## Frontend

10. **Every visible string has an English and an Urdu version** (`t('Sell', 'فروخت')`). No string in one language only.
11. **Right-to-left is built in.** Use `Row`, `Text`, `Icon flip` from `apps/mobile/src/ui/`. Never hard-code `left`/`right`/`marginLeft`; use `start`/`end`. Amounts and codes stay left-to-right Latin digits.
12. **Colors, radii and type come from tokens** (`src/theme/tokens.ts`). No raw hex in screens. One accent (emerald). Light and dark both work.
13. **Touch targets are at least 44 px**, icon-only buttons have `accessibilityLabel`, every input has a label.
14. **No emoji as icons.** Use the SVG set in `src/ui/icons.tsx`.
15. Use `npx expo install <pkg>` to add packages, and read the docs for the installed Expo SDK before using an Expo API. Expo changes between releases.

## Quality

16. **Logic that touches money, permissions, stock or sync has a test.** Pure logic: `apps/mobile/src/lib/*.test.ts`. Database rules: `supabase/tests/`.
17. **Before you call something done:** `npm run typecheck` and `npm test` in `apps/mobile`, and the database tests if you touched `supabase/`. Say what you did not run.
18. **Keep it small.** No abstraction for one caller, no config for a value that never changes, no scaffolding for later. Mark deliberate shortcuts with a `ponytail:` comment that names the ceiling.
19. Update `docs/` and `CHANGELOG.md` in the same change that changes behavior.

## Git

20. `main` is always releasable. Work happens on short-lived branches and lands by squash-merged pull request.
21. Branch names: `feat/…`, `fix/…`, `db/…`, `docs/…`, `chore/…`. Commit messages follow Conventional Commits (`feat(sell): add weight entry`). See `docs/git-workflow.md`.
22. Never force-push `main`, never skip hooks, never commit `.env` files, keystores or certificates.
