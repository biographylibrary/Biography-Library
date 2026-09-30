# Edge Function `help-assistant` (eliminata dal progetto Supabase a inizio ottobre 2026, dopo la prova del blocco 1)

**Che cosa faceva.** Era il vecchio chatbot di aiuto dell'applicazione: riceveva una domanda (massimo 1000 caratteri) e la lingua, costruiva un prompt di sistema con l'intera base di conoscenza della piattaforma (`help-kb.generated.ts`, generata da `docs/PLATFORM_KB.md` versione 1.3 del 25 giugno 2026) e chiamava Infomaniak (primario `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8`, ripiego `mistralai/Ministral-3-14B-Instruct-2512`, o i modelli dei segreti `INFOMANIAK_AI_MODEL_HELP_PRIMARY` / `_HELP_FALLBACK`). Rispondeva `{ answer, confidence }`, con `confidence: "low"` se la risposta conteneva frasi d'incertezza.

**Perché è stata tolta.**
1. La guida alla piattaforma oggi è Echo, con la base di conoscenza (`kb_chunks`) come contesto: questa funzione non aveva più chiamanti nell'applicazione.
2. Non era nel repository (né il sorgente né la configurazione): era rimasta deployata nel progetto Supabase (versione 29, ultimo deploy circa 25 giugno 2026) mentre `docs/BETA_RELEASE_CHECKLIST.md` la dava per inesistente.
3. Chiamava un modello fuori dal client unico (`lib/agents/infomaniak-client.ts`), quindi senza registro del consumo in `ai_token_usage` e senza tetto, per qualunque utente autenticato, anche con l'account in lista d'attesa. Con `verify_jwt: false`, la sola difesa era il controllo interno del token.

**Che cosa contiene questa cartella.** Il sorgente deployato così com'era (`index.ts.txt` e `help-kb.generated.ts.txt`; estensione `.txt` perché non diventino codice del progetto). Recuperato con lo strumento `get_edge_function` il 30 settembre 2026 prima dell'eliminazione.

## Come ripristinare le due funzioni (se dopo l'eliminazione qualcosa dovesse ancora dipendere da loro)

**`ai-assistant`.** La versione che girava in produzione (108, ultimo deploy 1 luglio 2026, 22:04 UTC) coincide byte per byte con il file in git al commit `5dd20c3` del 2 luglio 2026 (md5 `cdfb1da8d588d5ab537173b5006fc90d`, verificato il 1 ottobre 2026 confrontando il sorgente letto da Supabase con `git show`). Non è la versione dell'ultimo commit prima della rimozione (`ae7d41b`, 25 settembre): quella aggiunge `INFOMANIAK_AI_MODEL_GRAMMAR` e la catena Apertus, Gemma, Mistral per la grammatica, che in produzione non è mai stata distribuita.

```bash
mkdir -p /tmp/ai-assistant && git show 5dd20c3:supabase/functions/ai-assistant/index.ts > /tmp/ai-assistant/index.ts
```

Si distribuisce con `entrypoint_path: index.ts` e `verify_jwt: false` (la funzione verifica il token da sé: il commento nel file lo dice). Segreti letti: `INFOMANIAK_AI_TOKEN` e `INFOMANIAK_AI_ENDPOINT` (restano), facoltativi `INFOMANIAK_AI_MODEL_PRIMARY` e `_FALLBACK`, `AI_RATE_LIMIT`, `AI_DAILY_LIMIT`, `AI_WEEKLY_LIMIT` (con i valori predefiniti del codice). Non legge nessuno dei tre segreti tolti. Le tabelle che usava (`ai_rate_limits`, `ai_usage_tracking`) esistono ancora. Il codice dell'applicazione non la chiama più: per riaverla in uso serve anche rimettere i chiamanti.

**`help-assistant`.** Il sorgente è in questa cartella. Si copiano i due file togliendo `.txt` e si distribuisce con `verify_jwt: false`:

```bash
mkdir -p /tmp/help-assistant && cp docs/legacy/help-assistant/index.ts.txt /tmp/help-assistant/index.ts && cp docs/legacy/help-assistant/help-kb.generated.ts.txt /tmp/help-assistant/help-kb.generated.ts
```

Il file `index.ts` importa `./help-kb.generated.ts`, quindi vanno distribuiti entrambi. Segreti: `INFOMANIAK_AI_TOKEN` e `INFOMANIAK_AI_ENDPOINT` (restano). I modelli si leggono in quest'ordine: `INFOMANIAK_AI_MODEL_HELP_PRIMARY`, poi `INFOMANIAK_AI_MODEL_PRIMARY`, poi il valore fisso nel codice (Nemotron); per il ripiego, `_HELP_FALLBACK`, `INFOMANIAK_AI_MODEL_FALLBACK`, Ministral. I valori dei due segreti `_HELP_` non sono nel repository e il pannello di Supabase non li mostra: se si vuole ripristinarli identici, vanno conservati prima dell'eliminazione. Senza, la funzione ripristinata userebbe `INFOMANIAK_AI_MODEL_PRIMARY` e `_FALLBACK` se ancora impostati, altrimenti i modelli fissi nel codice.

## I tre segreti tolti

`INFOMANIAK_AI_MODEL` (valeva `mistral3`) non è letto da nessuna funzione rimasta né da `ai-assistant` nella versione distribuita. `INFOMANIAK_AI_MODEL_HELP_PRIMARY` e `INFOMANIAK_AI_MODEL_HELP_FALLBACK` li leggeva solo `help-assistant`.
