Esegui la checklist pre-release seguendo `docs/BETA_RELEASE_CHECKLIST.md`.

1. Leggi la checklist completa in `@docs/BETA_RELEASE_CHECKLIST.md`
2. Verifica localmente:
   - `npm run typecheck && npm run build && npm run lint`
   - Nessun marker di conflitto git (`<<<<<<<`) nel repo
   - Elenco migrazioni in `supabase/migrations/` da applicare in prod
3. Controlla variabili d'ambiente richieste (confronta con `.env.example` e `DEPLOYMENT.md`)
4. Per ogni voce della checklist, riporta: [ ] non verificato | [x] OK | [!] problema — con note
5. Se trovi gap bloccanti, elencali in ordine di priorità

Non applicare migrazioni su produzione senza conferma esplicita dell'utente.
