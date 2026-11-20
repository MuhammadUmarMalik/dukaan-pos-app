# 0007: Firebase replaces Supabase

Status: accepted. Supersedes the data and auth part of [0001](0001-stack.md).

**Decision.** Firebase is the backend: Firebase Authentication (email + password with verified email, Google, Apple), Cloud Firestore for data, Cloud Functions for server-side money rules, Firebase JS SDK in the app. The Postgres schema, RLS policies, SQL functions and their tests were removed from the working tree (still in git history, tags `v0.1.0` and the `db/product-rpcs` branch).

**Why it matters.** The old design leaned on SQL: row level security for tenancy, constraints and triggers for the append-only ledger, and aggregate queries for reports. Firestore has none of these, so:

- **Tenancy** moves to Security Rules. Every shop document lives under `shops/{shopId}/...`; membership is `shops/{shopId}/members/{uid}`; rules check it.
- **Money rules** (sales, khata, returns, voids, subscriptions, stock) must be Cloud Functions or Firestore transactions, never direct client writes. Needs the Blaze (pay as you go) plan.
- **Reports and ledger totals** need maintained counters or daily rollup documents, written in the same transaction as the sale. Firestore bills per document read, so list screens must page and use the local cache.
- **Limits and audit** are enforced in functions; the audit log is written by functions only.

RULES.md items 1 to 9 still hold in spirit (integer paisa, tenant isolation, append-only ledger, store billing only, access follows the store subscription). They are re-expressed for Firestore when each feature is built.

**Not built yet.** Data model, rules tests (Firebase emulator), Cloud Functions, store-webhook handling, App Check. Until then Firestore rules deny everything.
