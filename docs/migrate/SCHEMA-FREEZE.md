# Congelamento schema (Irlanda → Zurigo)

**Chiuso il 23 ottobre 2026** — passaggio a Zurigo riuscito. Il congelamento non è più in vigore.

Produzione: progetto Supabase `frycyhvhuifznxzamenn` (eu-central-2). Istantanea di schema in `supabase/baseline/baseline_zurich_20261022.sql` (vedi `supabase/baseline/README.md`).

## Cosa vale da ora

1. Nuove modifiche allo schema: file in `supabase/migrations/` con timestamp, applicati su **Zurigo** con `apply_migration` e versione allineata al prefisso del file (procedura in `DEPLOYMENT.md`).
2. Niente modifiche dirette allo schema dalla Dashboard senza file di migrazione (stessa disciplina di sempre, non un “congelamento” speciale).
3. L’Irlanda resta in pausa ≥ 30 giorni per eventuale rollback; non è più il database attivo.

## Storia

Fino al cutover: nessuna migrazione nuova in `main` mentre la baseline Zurigo era uno snapshot del live. Documentato qui e in `docs/migrate/CUTOVER-CHECKLIST.md` / `CUTOVER-RUNBOOK.md`.
