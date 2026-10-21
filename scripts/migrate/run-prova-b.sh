#!/usr/bin/env bash
# Prova generale Parte B — eseguire SOLO nel terminale dove sono già exportate
# MIGRATE_SOURCE_DB_URL e MIGRATE_DEST_DB_URL (mai echo/env/printenv).
set -euo pipefail
cd "$(dirname "$0")/../.."

ok_or_missing() {
  local name="$1"
  if [ -n "${!name:-}" ]; then echo "$name=ok"; else echo "$name=mancante"; exit 1; fi
}
ok_or_missing MIGRATE_SOURCE_DB_URL
ok_or_missing MIGRATE_DEST_DB_URL

node -e "
import { assertLooksLikeSource, assertSafeDest } from './scripts/migrate/lib-db.mjs';
const s = process.env.MIGRATE_SOURCE_DB_URL;
const d = process.env.MIGRATE_DEST_DB_URL;
assertLooksLikeSource(s);
assertSafeDest(d, s);
console.log('host_guards=ok');
"

export MIGRATE_DUMP_DIR="var/migrate-dumps/$(date -u +%Y%m%d-%H%M)-prova"
mkdir -p "$MIGRATE_DUMP_DIR"
REPORT="$MIGRATE_DUMP_DIR/prova-b-report.txt"
echo "MIGRATE_DUMP_DIR=$MIGRATE_DUMP_DIR" | tee "$REPORT"
git check-ignore -v "$MIGRATE_DUMP_DIR" | tee -a "$REPORT" || true
git status --short --untracked-files=normal | rg 'migrate-dumps|prova' || echo "git_status: dump dir not listed (good)" | tee -a "$REPORT"

run_step() {
  local n="$1"
  local label="$2"
  shift 2
  echo "" | tee -a "$REPORT"
  echo "=== STEP $n: $label ===" | tee -a "$REPORT"
  local t0
  t0=$(date +%s)
  set +e
  "$@" 2>&1 | tee -a "$REPORT"
  local ec=${PIPESTATUS[0]}
  set -e
  local t1
  t1=$(date +%s)
  local dur=$((t1 - t0))
  echo "STEP_${n}_DURATION_SEC=$dur EXIT=$ec" | tee -a "$REPORT"
  if [ "$ec" -ne 0 ]; then
    echo "STOPPED_AT_STEP=$n" | tee -a "$REPORT"
    exit "$ec"
  fi
}

TOTAL0=$(date +%s)
run_step 1 preflight node scripts/migrate/preflight.mjs
run_step 2 dump-source node scripts/migrate/dump-source.mjs
run_step 3 build-baseline node scripts/migrate/build-baseline.mjs
run_step 4 apply-baseline node scripts/migrate/apply-baseline.mjs --apply
run_step 5 restore-dest node scripts/migrate/restore-dest.mjs --apply
run_step 6 verify-counts node scripts/migrate/verify-counts.mjs
TOTAL1=$(date +%s)
echo "TOTAL_DURATION_SEC=$((TOTAL1 - TOTAL0))" | tee -a "$REPORT"

if [ -f "$MIGRATE_DUMP_DIR/data.dump" ]; then
  ls -lh "$MIGRATE_DUMP_DIR/data.dump" | tee -a "$REPORT"
fi
if [ -f "$MIGRATE_DUMP_DIR/baseline_zurich.sql" ]; then
  echo "baseline_first_line=$(head -1 "$MIGRATE_DUMP_DIR/baseline_zurich.sql")" | tee -a "$REPORT"
  rg -n '^CREATE EXTENSION' "$MIGRATE_DUMP_DIR/baseline_zurich.sql" | tee -a "$REPORT" || true
fi
echo "DONE" | tee -a "$REPORT"
echo "Remember: unset MIGRATE_SOURCE_DB_URL MIGRATE_DEST_DB_URL"
