# Rules

Hard rules for everyone who changes this repo, people and AI agents alike. If a change needs to break one, write an ADR in `docs/decisions/` first.

## Money and data

1. **Money is integer paisa** (Rs 1 = 100). Never floats, never rupees as decimals. Format only at the screen edge with `rs()` from `apps/mobile/src/lib/money.ts`.
2. **Every tenant document lives under `shops/{shopId}`** and Security Rules check shop membership. A document can never point at another shop.
3. **Ledger and stock are append-only.** Fix mistakes with a reversing entry, never an update or delete. Balances and stock counts are caches written in the same transaction.
4. **Cashiers write money through Cloud Functions** (sale, khata entry, return, void). The app never writes sales, payments, ledger entries, stock movements or returns directly.
5. **Data changes are deliberate.** Security Rules and Cloud Functions change only with a test, and stored data shapes change by adding fields, never by reinterpreting old ones.
6. **No admin or service-account credentials in the app.** Only the public Firebase web config goes in `EXPO_PUBLIC_*` variables. Real keys live in secret stores, never in git.
7. **Clients cannot delete data.** Removal is a `deletedAt` marker. Synced documents carry an `updatedAt` for sync.

## Billing

8. **Plans are bought only through Google Play Billing and Apple In-App Purchase.** No in-app JazzCash, Easypaisa or slip upload flow. No in-app text that points to outside payment on iOS.
9. Access follows the store subscription: trial, active and grace are full; hold, expired and refunded are read-only. Cloud Functions and Security Rules enforce it, the UI only reflects it.

## Frontend

10. **Every visible string has an English and an Urdu version** (`t('Sell', 'فروخت')`). No string in one language only.
11. **Right-to-left is built in.** Use `Row`, `Text`, `Icon flip` from `apps/mobile/src/ui/`. Never hard-code `left`/`right`/`marginLeft`; use `start`/`end`. Amounts and codes stay left-to-right Latin digits.
12. **Colors, radii and type come from tokens** (`src/theme/tokens.ts`). No raw hex in screens. One accent (emerald). Light and dark both work.
13. **Touch targets are at least 44 px**, icon-only buttons have `accessibilityLabel`, every input has a label.
14. **No emoji as icons.** Use the SVG set in `src/ui/icons.tsx`.
15. Use `npx expo install <pkg>` to add packages, and read the docs for the installed Expo SDK before using an Expo API. Expo changes between releases.

## Quality

16. **Logic that touches money, permissions, stock or sync has a test.** Pure logic: `apps/mobile/src/lib/*.test.ts`. Security Rules and functions: `firebase/tests/` (emulator, not set up yet).
17. **Before you call something done:** `npm run typecheck` and `npm test` in `apps/mobile`, and the rules tests if you touched `firebase/`. Say what you did not run.
18. **Keep it small.** No abstraction for one caller, no config for a value that never changes, no scaffolding for later. Mark deliberate shortcuts with a `ponytail:` comment that names the ceiling.
19. Update `docs/` and `CHANGELOG.md` in the same change that changes behavior.

## Git

20. `main` is always releasable and only receives `develop` (or an urgent store fix) by pull request. Features land in `develop` by squash-merged pull request; fixes collect in `hot-fixes`, which goes to `develop` by pull request. The owner merges into `main` and sets versions.
21. Branch names: `feature/…` from `develop`, `fix/…` merged into `hot-fixes`. Commit messages follow Conventional Commits (`feat(sell): add weight entry`). See `docs/git-workflow.md`.
22. Never force-push `main`, `develop` or `hot-fixes`, never skip hooks, never commit `.env` files, keystores or certificates.
