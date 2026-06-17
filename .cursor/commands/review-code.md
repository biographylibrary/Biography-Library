Fai una revisione del codice modificato di recente.

1. Confronta con `main` (base deploy) o il branch indicato dall'utente: `git diff main...HEAD` o `git diff --stat`
2. Controlla:
   - Bug logici e casi limite non gestiti
   - Sicurezza: RLS, service role exposure, auth su API routes, share-token
   - Stringhe UI senza i18n (`lib/i18n/translations.ts`)
   - Violazioni palette UI (classi `bg-red-*`, `bg-amber-*` invece di `brand-*`)
   - Migrazioni SQL: operazioni distruttive, indici mancanti
   - Codice duplicato o funzioni incomplete
3. Riporta **solo problemi concreti**, non preferenze di stile
4. Per ogni problema: file, riga (se possibile), descrizione, soluzione proposta
5. Classifica: critico / importante / minore

Non modificare file — solo report.
