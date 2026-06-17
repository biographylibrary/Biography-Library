Analizza e risolvi l'issue GitHub: $ARGUMENTS

1. Usa `gh issue view $ARGUMENTS` per leggere titolo, body e label
2. Cerca nel codice i file rilevanti (API routes, componenti editor, `lib/`, migrazioni)
3. Implementa le modifiche necessarie con diff minimo
4. Verifica: `npm run typecheck`, `npm run lint`, `npm run build` — mostra output completo
5. Se serve modifica DB, crea migrazione in `supabase/migrations/` (mai DROP senza piano)
6. Crea commit con messaggio descrittivo (`fix:` o `feat:` + riferimento issue)
7. Push sul branch corrente e apri PR con `gh pr create`
8. Nel body della PR includi `Closes #$ARGUMENTS` se appropriato

Restituisci link PR e riepilogo delle modifiche in italiano.
