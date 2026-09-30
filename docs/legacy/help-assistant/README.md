# Edge Function `help-assistant` (eliminata il 30 settembre 2026)

**Che cosa faceva.** Era il vecchio chatbot di aiuto dell'applicazione: riceveva una domanda (massimo 1000 caratteri) e la lingua, costruiva un prompt di sistema con l'intera base di conoscenza della piattaforma (`help-kb.generated.ts`, generata da `docs/PLATFORM_KB.md` versione 1.3 del 25 giugno 2026) e chiamava Infomaniak (primario `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8`, ripiego `mistralai/Ministral-3-14B-Instruct-2512`, o i modelli dei segreti `INFOMANIAK_AI_MODEL_HELP_PRIMARY` / `_HELP_FALLBACK`). Rispondeva `{ answer, confidence }`, con `confidence: "low"` se la risposta conteneva frasi d'incertezza.

**Perché è stata tolta.**
1. La guida alla piattaforma oggi è Echo, con la base di conoscenza (`kb_chunks`) come contesto: questa funzione non aveva più chiamanti nell'applicazione.
2. Non era nel repository (né il sorgente né la configurazione): era rimasta deployata nel progetto Supabase (versione 29, ultimo deploy circa 25 giugno 2026) mentre `docs/BETA_RELEASE_CHECKLIST.md` la dava per inesistente.
3. Chiamava un modello fuori dal client unico (`lib/agents/infomaniak-client.ts`), quindi senza registro del consumo in `ai_token_usage` e senza tetto, per qualunque utente autenticato, anche con l'account in lista d'attesa. Con `verify_jwt: false`, la sola difesa era il controllo interno del token.

**Che cosa contiene questa cartella.** Il sorgente deployato così com'era (`index.ts.txt` e `help-kb.generated.ts.txt`; estensione `.txt` perché non diventino codice del progetto). Recuperato con lo strumento `get_edge_function` il 30 settembre 2026 prima dell'eliminazione.

## Nota sulla funzione `ai-assistant` (anch'essa eliminata)

La versione deployata in produzione (108, ultimo deploy circa 1 luglio 2026) non è quella del repository: non leggeva `INFOMANIAK_AI_MODEL_GRAMMAR` e per la grammatica usava Gemma poi Mistral (`[PRIMARY_MODEL, FALLBACK_MODEL]`); la catena con Apertus per primo esisteva solo nel codice del repository. Il resto coincideva. La versione del repository si recupera dalla cronologia di git (ultimo commit prima del 30 settembre 2026 che contiene `supabase/functions/ai-assistant/index.ts`).
