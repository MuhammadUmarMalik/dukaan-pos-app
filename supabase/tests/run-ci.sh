#!/usr/bin/env bash
# Same checks as run-local.ps1 for CI: applies shim, migrations, seed and tests with psql.
# Connection comes from PGHOST, PGUSER, PGPASSWORD, PGDATABASE.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in tests/00_supabase_shim.sql migrations/*.sql seed.sql tests/10_isolation.sql; do
  echo "== $f"
  psql -v ON_ERROR_STOP=1 -q -f "$f"
done
