# Checklist passaggio Supabase Irlanda → Zurigo

## Preparazione (Parte A — nessun write su Zurigo)

- [ ] Client Postgres 17+ installati (`node scripts/migrate/preflight.mjs`)
- [ ] `MIGRATE_SOURCE_DB_URL` / `MIGRATE_DEST_DB_URL` = URI **pooler session mode** (non host `db.*` solo IPv6)
- [ ] `git check-ignore var/migrate-dumps/foo.dump` → ignorato
- [ ] Dump sorgente: `node scripts/migrate/dump-source.mjs`
- [ ] Baseline: `MIGRATE_DUMP_DIR=… node scripts/migrate/build-baseline.mjs`
- [ ] Dry-run restore: `node scripts/migrate/restore-dest.mjs --dry-run`
- [ ] **Congelamento schema** attivo (`docs/migrate/SCHEMA-FREEZE.md`) — nessuna migrazione in `main`

## Prova generale (Parte B — Zurigo)

- [ ] Applicare `baseline_zurich.sql` su Zurigo (una volta)
- [ ] `node scripts/migrate/restore-dest.mjs --apply`
- [ ] `node scripts/migrate/verify-counts.mjs` → zero diff
- [ ] Bucket già creati dalla baseline; poi `node scripts/migrate/copy-storage.mjs`
- [ ] `node scripts/migrate/verify-storage.mjs`
- [ ] Auth config / Edge / cron (fasi successive del piano)

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
