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

Le migrazioni con versione **maggiore** di `20261022000000` si applicano sopra (MCP `apply_migration` + allineamento versione al prefisso del file, come in `DEPLOYMENT.md`).
