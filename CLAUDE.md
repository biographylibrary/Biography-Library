# Istruzioni per gli agenti

Regole che valgono per Claude Code, Cursor e chiunque altro scriva codice qui.

## Variabili d'ambiente

`.env.example` è l'elenco documentato di ogni variabile che il progetto legge. Non è un riassunto né un esempio parziale: `npm run check:env` lo confronta con il codice e la CI fallisce se i due divergono.

Quando aggiungi, rinomini o togli una chiave, va scritta in tutti i posti che servono, non solo in quello che ti serve adesso.

| # | Dove | Nota |
| - | ---- | ---- |
| 1 | `.env.local` | La tua macchina. Mai versionato. |
| 2 | `.env.example` | L'elenco documentato. Commenta la riga se la chiave è facoltativa: una chiave commentata conta comunque come documentata. |
| 3 | `/opt/bl-app/.env` su Jelastic | Produzione. Si imposta a mano via SSH, poi serve un nuovo deploy. Per le `NEXT_PUBLIC_*` non basta riavviare: Next.js le incorpora nel codice durante `next build`, quindi il valore entra in vigore solo con una nuova immagine. |
| 4 | Segreti delle Edge Function Supabase | Solo per le chiavi lette da `supabase/functions/*`, che girano su Deno e usano `Deno.env.get`. |
| 5 | `.github/workflows/ci.yml` | Solo le `NEXT_PUBLIC_*` necessarie al build, con valori segnaposto. |

I punti 1, 2 e 5 sono verificati automaticamente. I punti 3 e 4 sono manuali e falliscono in silenzio: una chiave dimenticata lì non fa cadere l'applicazione, spegne una funzione senza dirlo a nessuno. Quando una modifica tocca una chiave usata in produzione o da una Edge Function, dillo esplicitamente all'utente nel riepilogo, perché quell'azione può farla solo lui.

Non scrivere mai valori reali in `.env.example`: solo segnaposto. Non leggere né stampare il contenuto di `.env.local`.

Se una chiave è letta in modo indiretto, cioè il suo nome è una stringa in una mappa risolta a runtime come in `lib/agents/models.ts`, aggiungi quel file a `DYNAMIC_LOOKUP_FILES` in `scripts/check-env.mjs`, altrimenti il controllo la segnalerà come documentata ma non usata.

## Specifica dell'identificativo UM

`docs/UM-IDENTIFIER-SPEC.md` è una specifica pubblica e depositata, non documentazione interna. I vettori di prova della sezione 7 sono vincolanti: se un test fallisce, l'errore è nel codice e va corretto lì, mai adattando il vettore atteso. Il formato, l'alfabeto e l'algoritmo di controllo non si modificano, e gli identificativi già emessi non si rigenerano.
