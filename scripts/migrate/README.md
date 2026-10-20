# Script di migrazione Storage / schema (Supabase → Zurich → Infomaniak)

Origine e destinazione sono sempre configurabili via ambiente. Non hardcodare project ref.

## Variabili

| Variabile | Uso |
|-----------|-----|
| `MIGRATE_SOURCE_URL` | `https://….supabase.co` origine |
| `MIGRATE_SOURCE_SERVICE_KEY` | service_role (o secret) origine |
| `MIGRATE_DEST_URL` | destinazione (opzionale per inventory/backfill sola lettura) |
| `MIGRATE_DEST_SERVICE_KEY` | service_role destinazione |
| `MIGRATE_DUMP_DIR` | default `var/migrate-dumps/<run>` |
| `SUPABASE_ACCESS_TOKEN` | Management API (solo `export-auth-config`) |

Caricare da `.env.local` a mano o:

```bash
set -a && source .env.local && set +a
export MIGRATE_SOURCE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export MIGRATE_SOURCE_SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
```

## Comandi

```bash
# Inventario (sola lettura)
node scripts/migrate/inventory.mjs

# Export Auth via Management API (richiede token)
SUPABASE_ACCESS_TOKEN=sbp_… PROJECT_REF=<project-ref> \
  node scripts/migrate/export-auth-config.mjs

# Copia oggetti Storage origine → destinazione
node scripts/migrate/copy-storage.mjs

# Verifica bidirezionale storage.objects ↔ file
node scripts/migrate/verify-storage.mjs

# Estrae path da file_url / export URL (dry-run di default)
node scripts/migrate/backfill-storage-paths.mjs
node scripts/migrate/backfill-storage-paths.mjs --apply   # solo con conferma esplicita
```

Dump Postgres: vedi istruzioni in questo README § Dump e `docs/migrate/DUMPS.md`. Gli script Node non sostituiscono `pg_dump`.

## Dump Postgres (manuale, cifrato dopo)

1. Creare `MIGRATE_DUMP_DIR` sotto `var/migrate-dumps/` (gitignored).
2. Con connection string del progetto (Dashboard → Database → URI, ruolo postgres):

```bash
pg_dump "$SOURCE_DB_URL" \
  --format=custom --no-owner --no-acl \
  -f "$MIGRATE_DUMP_DIR/db.dump"

# Solo schema (per materializzare la migrazione baseline):
pg_dump "$SOURCE_DB_URL" \
  --schema-only --no-owner --no-acl \
  -f "$MIGRATE_DUMP_DIR/schema-only.sql"
```

3. Cifrare e caricare su Infomaniak come in `docs/migrate/DUMPS.md`.
4. **Non** committare `schema-only.sql` finché non è stato ripulito da secret/commenti sensibili e trasformato nella migrazione baseline concordata.

## Keep-alive Free (Zurich pre-cutover)

Finché l’app punta ancora a Irlanda, Zurich non riceve i cron Jelastic. Serve una query PostgREST reale, ad es.:

```bash
curl -sS -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$ZURICH_URL/rest/v1/profiles?select=id&limit=1"
```

Non usare `/auth/v1/health` (non conta come attività DB).

## Sicurezza

- Mai stampare service keys o hook secret nei log.
- `backfill-storage-paths --apply` sul live solo dopo approvazione esplicita (oggi Fase A = dry-run).
