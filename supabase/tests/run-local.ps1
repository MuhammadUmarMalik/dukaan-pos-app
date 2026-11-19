# Runs migrations + seed + tests on a throwaway Postgres cluster (port 54329). Does not touch any installed database.
# Usage: powershell -File supabase/tests/run-local.ps1   (needs PostgreSQL binaries; adjust $pg if installed elsewhere)
$ErrorActionPreference = 'Stop'
$pg   = 'C:\Program Files\PostgreSQL\18\bin'
$root = Split-Path -Parent $PSScriptRoot
$tmp  = Join-Path $env:TEMP ('dukaan-pgtest-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$port = 54329
& "$pg\initdb.exe" -D "$tmp\data" -U postgres --auth=trust -E UTF8 | Out-Null
# Start via Start-Process with file redirection: a piped pg_ctl keeps the pipe open and never returns.
Start-Process -FilePath "$pg\pg_ctl.exe" -ArgumentList @('-D', "`"$tmp\data`"", '-o', "`"-p $port -c listen_addresses=127.0.0.1`"", '-l', "`"$tmp\log.txt`"", '-w', 'start') `
  -NoNewWindow -RedirectStandardOutput "$tmp\ctl.out" -RedirectStandardError "$tmp\ctl.err"
for ($i = 0; $i -lt 60; $i++) { & "$pg\pg_isready.exe" -h 127.0.0.1 -p $port -q; if ($LASTEXITCODE -eq 0) { break }; Start-Sleep -Milliseconds 500 }
try {
  $psql = @('-h', '127.0.0.1', '-p', $port, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q')
  & "$pg\createdb.exe" -h 127.0.0.1 -p $port -U postgres dukaan
  $files = @("$root\tests\00_supabase_shim.sql") + (Get-ChildItem "$root\migrations\*.sql" | Sort-Object Name | ForEach-Object FullName) + "$root\seed.sql" + "$root\tests\10_isolation.sql"
  foreach ($f in $files) {
    Write-Host "== $(Split-Path -Leaf $f)"
    & "$pg\psql.exe" @psql -d dukaan -f $f
    if ($LASTEXITCODE -ne 0) { throw "failed: $f" }
  }
} finally {
  & "$pg\pg_ctl.exe" -D "$tmp\data" -m immediate stop | Out-Null
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
