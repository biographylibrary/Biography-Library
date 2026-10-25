# Istantanea schema Zurigo

`baseline_zurich_20261022.sql` è l’istantanea dello **schema** (nessun dato) al 22 ottobre 2026, usata per creare il database di produzione su Zurigo (`frycyhvhuifznxzamenn`). Serve solo per **ricostruzione di emergenza** su un Postgres vuoto compatibile con Supabase.

## Applicazione

```bash
psql -1 -v ON_ERROR_STOP=1 -f supabase/baseline/baseline_zurich_20261022.sql
```

Serve psql 17.6 o superiore: il file contiene i comandi `\restrict` e `\unrestrict` generati da pg_dump 17, che le versioni più vecchie di psql non riconoscono.

Registra in `supabase_migrations.schema_migrations` la versione `20261022000000` (`baseline_zurich`).

## Migrazioni successive

I file in `supabase/migrations/` con versione **minore o uguale** a `20261022000000` sono già inclusi nell’istantanea: **non** vanno rieseguiti su un database creato da questo file.

Le migrazioni con versione **maggiore** di `20261022000000` si applicano sopra (MCP `apply_migration` + allineamento versione al prefisso del file, come in `DEPLOYMENT.md`). Esempi: `20261023190000_drop_public_list_biography_exports.sql` (elenco pubblico su `biography-exports`); `20261024100000_security_anon_functions.sql` (permessi RPC/trigger e controlli su `get_ai_usage` / `increment_view_count`); `20261025120000_biographies_anon_column_grants.sql` (SELECT a colonna per `anon` su `biographies`, niente SELECT anon su `biography_flat`). L’istantanea in repo riflette già questi comportamenti così una ricostruzione da zero non li reintroduce; le migrazioni restano idempotenti sopra Zurigo. Il generatore `scripts/migrate/build-baseline.mjs` (`applyAnonBiographyColumnGrants`) applica lo stesso ACL quando si rigenera il dump.
