Crea un commit con tutte le modifiche correnti.

1. Esegui in parallelo `git status` e `git diff` (staged e unstaged)
2. Analizza le modifiche e scrivi un messaggio di commit chiaro: `tipo: descrizione breve` (es. `feat: aggiunge review AI su draft PDF`)
3. Aggiungi i file rilevanti allo stage (escludi segreti, `.env.local`, file temporanei)
4. Esegui `npm run typecheck && npm run build` prima del commit; se fallisce, correggi o segnala
5. Fai commit con HEREDOC per il messaggio
6. Push sul branch corrente con `-u` se necessario
7. Apri PR con `gh pr create` — titolo chiaro, body con Summary e Test plan (usa `.github/PULL_REQUEST_TEMPLATE.md` come guida)
8. Restituisci il link alla PR

Non fare push su `main` diretto. Non committare senza che l'utente abbia approvato le modifiche se erano in review.
