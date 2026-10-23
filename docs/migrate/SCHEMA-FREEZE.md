# Congelamento schema (Irlanda → Zurigo)

**Da ora fino al cutover riuscito: nessuna migrazione nuova deve essere unita in `main`.**

Il file di base Zurigo (`baseline_zurich.sql`, generato in `var/migrate-dumps/` da `scripts/migrate/build-baseline.mjs`) è uno snapshot dello schema pubblico live. Se tra il dump e il ripristino entra una migrazione in produzione, la baseline va **rigenerata** (nuovo `dump-source` + `build-baseline`).

## Regole

1. Non aprire / non unire PR che aggiungono file in `supabase/migrations/` finché la prova generale e il passaggio non sono chiusi.
2. Non modificare lo schema Irlanda dalla Dashboard (SQL editor / table editor).
3. Eccezioni solo con conferma esplicita e immediatamente seguite da nuovo dump + baseline.

## Checklist cutover

Vedi `docs/migrate/CUTOVER-CHECKLIST.md`.
