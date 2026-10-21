# Script di migrazione Supabase Irlanda → Zurigo

Sorgente: `gckmusbozgbclokvbnwx` (sola lettura dagli script di dump).  
Destinazione: `frycyhvhuifznxzamenn` (ogni write è bloccata se l’host non è Zurigo).

**Congelamento schema:** vedi `docs/migrate/SCHEMA-FREEZE.md`.  
**Checklist cutover:** `docs/migrate/CUTOVER-CHECKLIST.md`.  
**Dump cifrati:** `docs/migrate/DUMPS.md`.

## Preflight

```bash
node scripts/migrate/preflight.mjs
node scripts/migrate/preflight.mjs --dry-run
```

Serve `pg_dump` / `pg_restore` / `psql` **≥ 17** (Irlanda 17.6, Zurigo 17.11). Se mancano:

```bash
brew install postgresql@17
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
# oppure: brew install libpq && brew link --force libpq
```

Non vengono installati automaticamente dagli script.

## Variabili

| Variabile | Uso |
|-----------|-----|
| `MIGRATE_SOURCE_DB_URL` | URI Postgres **pooler session** Irlanda (dump / verify) |
| `MIGRATE_DEST_DB_URL` | URI Postgres **pooler session** Zurigo (restore / verify) |
| `MIGRATE_SOURCE_URL` | `https://….supabase.co` API sorgente (storage) |
| `MIGRATE_SOURCE_SERVICE_KEY` | service_role sorgente |
| `MIGRATE_DEST_URL` | API destinazione |
| `MIGRATE_DEST_SERVICE_KEY` | service_role destinazione |
| `MIGRATE_DUMP_DIR` | cartella run sotto `var/migrate-dumps/` |
| `MIGRATE_BUCKETS` | opzionale, elenco bucket |
| `MIGRATE_VERIFY_HASH` | `1` = confronta SHA-256 file |
| `MIGRATE_ALLOW_APPLY` | `1` = consente backfill `--apply` |
| `SUPABASE_ACCESS_TOKEN` | solo `export-auth-config` |

Usa il connection string del **pooler in modalità session**, non l’host `db.<ref>.supabase.co` (spesso solo IPv6).

Mai mettere password in file versionati. Gli script stampano solo URL con password mascherata (`***`).

## Parte A — preparazione (nessun write su Zurigo)

```bash
export MIGRATE_SOURCE_DB_URL='postgresql://…@aws-0-….pooler.supabase.com:5432/postgres'
export MIGRATE_DUMP_DIR="var/migrate-dumps/$(date -u +%Y%m%d-%H%M)-irlanda"

node scripts/migrate/preflight.mjs
node scripts/migrate/dump-source.mjs --dry-run
node scripts/migrate/dump-source.mjs          # scrive solo in MIGRATE_DUMP_DIR

MIGRATE_DUMP_DIR="$MIGRATE_DUMP_DIR" node scripts/migrate/build-baseline.mjs --dry-run
MIGRATE_DUMP_DIR="$MIGRATE_DUMP_DIR" node scripts/migrate/build-baseline.mjs

node scripts/migrate/restore-dest.mjs --dry-run
node scripts/migrate/verify-counts.mjs --dry-run
node scripts/migrate/copy-storage.mjs --dry-run
```

Output tipico in `MIGRATE_DUMP_DIR` (gitignored):

- `public-schema.sql` — schema `public`, `--no-owner`, **con** GRANT  
- `data.dump` — custom: dati `public` + auth selezionate (no sessions/refresh/audit, no storage)  
- `row-counts.json`  
- `baseline_zurich.sql` — schema + extension vector + trigger auth + bucket + policy storage + riga `schema_migrations`  
- `baseline-notes.json`

## Parte B — ripristino Zurigo (non in Parte A)

1. Applicare una volta `baseline_zurich.sql` su Zurigo (psql).  
2. `MIGRATE_DEST_DB_URL=… node scripts/migrate/restore-dest.mjs --apply`  
3. `node scripts/migrate/verify-counts.mjs`  
4. `node scripts/migrate/copy-storage.mjs` poi `verify-storage.mjs`

`restore-dest` abortisce se l’host destinazione non contiene `frycyhvhuifznxzamenn`, se contiene `gckmusbozgbclokvbnwx`, o se coincide con la sorgente.

## Altri comandi (già esistenti)

```bash
node scripts/migrate/inventory.mjs
node scripts/migrate/export-auth-config.mjs
node scripts/migrate/backfill-storage-paths.mjs
```

## Sicurezza (nel codice)

- `assertSafeDest` in `lib-db.mjs` (e call-site su restore / copy-storage / verify).  
- Dump sorgente: solo `pg_dump` / `SELECT`.  
- Nessun dump nel repo: `var/migrate-dumps/` è ignorata (`git check-ignore`).
