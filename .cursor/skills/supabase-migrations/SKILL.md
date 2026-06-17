# Skill: Supabase migrations

Usa questa skill quando modifichi lo schema database, aggiungi colonne/tabelle, o applichi migrazioni in dev/prod.

## Dove vivono le migrazioni

```
supabase/migrations/
  YYYYMMDDHHMMSS_descrizione_snake_case.sql
```

Esempio recente: `20260508120000_biography_media_cover_a5_layout.sql`

## Regole

1. **Un file per modifica logica** — mai editare migrazioni già applicate in prod
2. **Naming:** timestamp UTC + descrizione breve in snake_case
3. **Commento in testa** al file SQL che spiega lo scopo
4. **Evita DROP** distruttivi senza piano e backup; preferisci `ADD COLUMN IF NOT EXISTS`
5. **RLS:** nuove tabelle devono avere policy coerenti con le esistenti
6. **CHECK constraints:** se modifichi enum-like (es. `layout`), fai `DROP CONSTRAINT IF EXISTS` poi `ADD CONSTRAINT`

## Applicazione

**Locale / dev:**
```bash
supabase db push
# oppure SQL Editor nel dashboard Supabase
```

**Produzione:** solo dopo review e checklist `docs/BETA_RELEASE_CHECKLIST.md`. Ordine strettamente per timestamp.

## Verifica post-migrazione

- Colonne nuove visibili su tabella target (`biographies`, `biography_media`, `biography_book_structure`, …)
- Funzioni RPC aggiornate se referenziate (es. `get_biography_by_share_token`)
- `npm run build` ancora OK se tipi TypeScript dipendono dallo schema

## File di riferimento

- `supabase/migrations/` — tutte le migrazioni ordinate
- `DEPLOYMENT.md` — secrets e Edge Functions
- `.cursor/rules/03-security.mdc` — conferma utente prima di prod
