# 0004: Money writes go through server functions

Status: accepted

**Context.** A review found that cashier insert policies only checked the shop, so a cashier could backdate sales, post khata adjustments, hide stock or invent cash returns by writing tables directly.

**Decision.** Cashiers have no direct insert on sales, payments, ledger, stock movements, returns or cash closings. They call `record_sale`, `record_ledger_entry`, `record_return` and `void_sale`, which recompute totals, check permissions and subscription access, are idempotent on id, and write everything in one transaction. Owners and managers keep direct insert for imports and corrections. Ledger and stock are append-only; balances are trigger-maintained caches.

**Consequences.** The offline outbox must send these calls instead of raw inserts. One place enforces money rules, and one test suite covers them.
