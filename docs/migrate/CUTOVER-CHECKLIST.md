# Checklist passaggio Supabase Irlanda → Zurigo

## Decisioni chiuse (non riaprire in prova)

| Tema | Decisione |
|------|-----------|
| URI pooler session | Li fornisce Claudio in shell con `read -s` al momento della prova; **mai** in file o commit |
| Client Postgres | `brew install postgresql@17` (fallback: binari in `~/.local/pgsql-17/bin`, vedi `scripts/migrate/README.md`) |
| Migrazioni orfane | Già assorbite nello schema live: il dump dal DB vivo le include; non serve un pezzo a parte |
| Export Auth Dashboard | Già fatto (`var/migrate-dumps/auth-config-*.json`, gitignored) |
| Keep-alive pre-cutover | **Non serve**: Zurigo è su piano Pro (niente pause idle) |

## Preparazione (Parte A — nessun write su Zurigo)

- [ ] Client Postgres 17+ installati (`node scripts/migrate/preflight.mjs`)
- [ ] `MIGRATE_SOURCE_DB_URL` / `MIGRATE_DEST_DB_URL` = URI **pooler session mode** (non host `db.*` solo IPv6), inseriti solo in shell (`read -s`)
- [ ] `git check-ignore var/migrate-dumps/foo.dump` → ignorato
- [ ] Dump sorgente: `node scripts/migrate/dump-source.mjs`
- [ ] Baseline: `MIGRATE_DUMP_DIR=… node scripts/migrate/build-baseline.mjs`
- [ ] Dry-run restore: `node scripts/migrate/restore-dest.mjs --dry-run`
- [ ] **Congelamento schema** attivo (`docs/migrate/SCHEMA-FREEZE.md`) — nessuna migrazione in `main`

## Prova generale (Parte B — Zurigo)

- [ ] Applicare `baseline_zurich.sql` su Zurigo (una volta) — `apply-baseline.mjs --apply`
- [ ] `node scripts/migrate/restore-dest.mjs --apply`
- [ ] `node scripts/migrate/verify-counts.mjs` → zero diff (conteggi + checksum contenuto)
- [ ] Bucket già creati dalla baseline; poi `node scripts/migrate/copy-storage.mjs`
- [ ] `node scripts/migrate/verify-storage.mjs`
- [ ] Auth config / Edge / cron (fasi successive; export Auth già disponibile in locale)

## Cutover app

- [ ] Manutenzione accesa dal pannello admin (dopo `/admin` per il cookie bypass)
- [ ] Env Jelastic → URL/chiavi Zurigo + rebuild
- [ ] Smoke login, bozza, foto, reset password
- [ ] Manutenzione spenta
- [ ] Irlanda in pausa ≥30 giorni (non cancellare subito)

## Sicurezza script

- Destinazione deve contenere `frycyhvhuifznxzamenn` e non `gckmusbozgbclokvbnwx`
- Mai stampare password: gli script mascherano gli URL
- Dump mai nel repository
