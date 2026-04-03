# Biography Library — Tech Context

## Variabili d'ambiente necessarie
```env
NEXT_PUBLIC_SUPABASE_URL=           # URL progetto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Chiave pubblica Supabase
SUPABASE_SERVICE_ROLE_KEY=          # Solo server-side / Edge Functions
NEXT_PUBLIC_APP_URL=                # URL app (es. https://biographylibrary.org)
INFOMANIAK_API_TOKEN=               # Token API Infomaniak (Apertus LLM + Whisper)
```
> ⚠️ MAI inserire `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` o chiavi di provider USA — violano il Manifesto.

## Deploy target
- **Produzione app**: Infomaniak Jelastic Cloud (Docker, regione Svizzera)
- **CI/CD**: GitHub Actions → push su `main-sync` → build + deploy su Jelastic
- **Database / Auth / Storage**: Supabase Cloud (temporaneo — migrazione futura su Infomaniak)
- **Dev locale**: `npm run dev` su `localhost:3000`

## Edge Functions Supabase
| Funzione | Scopo | verify_jwt |
|---|---|---|
| `ai-assistant` | AI writing tools via Infomaniak Apertus (grammar, prompts, summary, rewrite) | false (auth interna) |
| `log-error` | Error logging → tabella `error_logs` | false (accetta anche unauthenticated) |

## AI Provider — SOLO Infomaniak
- **Testi**: Infomaniak Apertus API (Mistral) — `INFOMANIAK_API_TOKEN`, configurato in `lib/ai/ai-client.ts`
- **Audio**: Infomaniak Whisper API ✅ attivo — stesso token `INFOMANIAK_API_TOKEN`, endpoint diverso
- Modello testi: Mistral 3
- MAI sostituire con OpenAI, Anthropic, Gemini, Cohere o qualsiasi provider non-svizzero
- Rate limit per utente: 40 azioni/giorno, 200 azioni/settimana

## Dipendenze chiave (package.json)
```json
"next": "13.5.1",
"react": "18.2.0",
"@supabase/supabase-js": "2.58.0",
"@tiptap/starter-kit": "3.19.0",
"jspdf": "4.1.0",
"docx": "8.5.0",
"mammoth": "1.11.0",
"next-intl": "4.8.2",
"next-themes": "0.3.0",
"next-pwa": "*",
"react-hook-form": "7.53.0",
"zod": "3.23.8",
"sonner": "1.5.0"
```

## File da NON toccare senza analisi preventiva
- `lib/auth-context.tsx` — cuore dell'autenticazione
- `middleware.ts` — se esiste, gestisce protezione server-side
- `supabase/functions/ai-assistant/index.ts` — Edge Function AI produzione
- `lib/ai/ai-client.ts` — client AI con rate limiting
- Migration files esistenti — creare sempre nuova migration

## Vincoli architetturali
- Nessun provider cloud USA (no AWS, no GCP, no Azure) in produzione
- Nessun AI proprietario/commerciale per training sull'archivio
- RLS abilitato su OGNI tabella Supabase
- Ogni stringa UI → tradotta in EN/IT/FR/DE
- Nessun secret nel repo (.env.local in .gitignore)
- Licenza AGPL-3.0 — contribuzioni welcome, fork allowed
