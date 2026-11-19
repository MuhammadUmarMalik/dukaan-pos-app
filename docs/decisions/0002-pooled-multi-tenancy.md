# 0002: Pooled multi-tenancy with row level security

Status: accepted

**Context.** Thousands of small shops, each tiny. A database or server per shop would cost more than a shop pays.

**Decision.** One shared schema. Every tenant table has `shop_id`; row level security restricts users to shops they belong to; composite foreign keys `(shop_id, parent_id)` make cross-shop references impossible. Policies call helper functions as `(select ...)` so they are evaluated once per query.

**Consequences.** Cheap to run and easy to operate. Isolation depends on policies and tests, so the isolation test suite is part of every database change. Heavy tenants can move to a dedicated database later because `shop_id` is everywhere.
