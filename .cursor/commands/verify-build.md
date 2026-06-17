Esegui la verifica build completa del progetto e mostra l'output integrale.

1. `npm run typecheck` — se fallisce, elenca errori con file e riga
2. `npm run lint` — se fallisce, elenca warning/errori rilevanti
3. `npm run build` — se fallisce, identifica la causa root
4. Riporta esito finale: PASS o FAIL per ciascun step
5. Se FAIL, proponi fix mirati senza refactor non richiesti

Nota: il progetto non ha `npm test`. La verifica automatizzata si ferma a typecheck + lint + build.
