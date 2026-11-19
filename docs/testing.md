# Testing

| What | Command | Covers |
|---|---|---|
| Typecheck | `cd apps/mobile && npm run typecheck` | Types for the whole app. |
| Unit tests | `cd apps/mobile && npm test` | `src/lib/*.test.ts`: money formatting, line totals, discounts. Uses Node's built-in test runner. |
| Database | `powershell -File supabase/tests/run-local.ps1` | Applies all migrations and the seed to a throwaway Postgres (port 54329), then runs `supabase/tests/10_isolation.sql`. Needs PostgreSQL 18 binaries. Does not touch other databases. |
| Visual | `cd apps/mobile && npx expo start --web` | Layout, English and Urdu, light and dark, in a browser. |

## What the database tests prove

Tenant isolation (no cross-shop reads, writes or references), role rules (cashier cannot add products, read costs or write money rows directly), money functions (totals recomputed, idempotent retries, discount and credit-limit permissions, returns, voids), integrity (ledger signs, one reversal per entry, stock signs, bill number format), column-level grants and server-set columns, audit coverage, plan limits, function exposure, subscription events (idempotent, late older events ignored), RLS enabled on every public table, sync cursor behavior.

The run prints `ALL PHASE 1 CHECKS PASSED` on success. Any `FAIL` stops it.

## Not covered yet

Anything on a real device (Bluetooth printing, barcode camera, store purchases), a real Supabase project, and end-to-end tests of the app. Say so when a change needs one of these and you could not run it.

## CI

`.github/workflows/ci.yml` runs typecheck, unit tests and the database tests on every pull request. The database job runs the same SQL files through `psql` against a Postgres service container.
