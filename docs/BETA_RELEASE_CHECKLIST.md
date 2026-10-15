# Checklist operativa — release / beta pubblica

Usare come elenco da spuntare in team. Ordine consigliato: **merge → migrazioni prod → env → deploy → smoke test**.

---

## 0. Prima di iniziare

- [ ] Finestra di tempo concordata (comunicazione interna se serve).
- [ ] Accesso a: GitHub (merge), Supabase (produzione), host deploy (Jelastic / SSH), eventuale Resend/dashboard DNS.

---

## 1. Merge e qualità codice

- [ ] Branch di lavoro integrato in `main` via pull request (mai push diretto su `main`)
- [ ] `npm run typecheck` && `npm run build` (e `npm run lint` se tocca UI)
- [ ] CI (`.github/workflows/ci.yml`): typecheck, lint, build, `check:env`, `check:dead`, suite Vitest
- [ ] Se toccata la guida piattaforma: `npm run kb:sync` && `npm run kb:sync:check`

---

## 2. Migrazioni database (Supabase **produzione**)

- [x] Migrazioni v1 applicate su Supabase dev (`20260508_add_draft_ai_feedback_to_biographies`, `20260508120000_biography_media_cover_a5_layout`, `20260508180000_biography_book_structure_author_copyright_page`)
- [x] Migrazione agenti: `agent_tables` (thread, messaggi, RAG, `agent_usage`) su progetto dev `gckmusbozgbclokvbnwx`
- [ ] Stesse migrazioni applicate su Supabase **produzione** (se progetto separato da dev)

**Blocco 1 (ramo `blocco-1-strumenti-ai`): otto migrazioni nuove. Non applicarle senza conferma esplicita.** Sequenza completa, nell'ordine (una chiamata `apply_migration` per file):

| # | Migrazione | Quando | Che cosa fa |
|---|---|---|---|
| 0 | prova a secco (`node scripts/build-dry-run.mjs`, un solo blocco che annulla tutto) | prima di tutto, a un orario concordato | applica le migrazioni del blocco (sette al momento della prova, otto oggi), confronta il catalogo, prova le scritture vietate; nessuna modifica resta. **Eseguita il 30 settembre 2026 su produzione: 41 prove su 41, nove pezzi di testo con md5 uguale ai file, 196 ms in tutto (da 33 a 196 ms con i blocchi presi), stato di produzione identico prima e dopo** |
| 1 | `20260930115700_publication_records.sql` | **prima del deploy** | aggiunge il registro delle impronte |
| 2 | `20260930115800_ai_token_usage.sql` | **prima del deploy** | aggiunge registro dei consumi e tetti |
| | unione su `main` (deploy) | | |
| 3 | `20260930115900_align_biographies_profiles_triggers.sql` | **dopo il deploy** | a parità con la produzione, non cambia nulla |
| 4 | `20260930120000_server_only_columns_and_reports.sql` | **dopo il deploy** | colonne riservate al server; toglie tre policy di INSERT |
| 5 | `20260930120100_drop_biography_view_translations.sql` | **dopo il deploy** | elimina la tabella delle traduzioni per i lettori (il vecchio codice la legge ancora) |
| 6 | `20260930120150_author_text_whitelist.sql` | **dopo il deploy** | testo scrivibile solo negli stati di lavoro |
| 7 | `20260930120200_agent_threads_echo_only.sql` | **dopo il deploy** | solo thread di Echo |
| 8 | `20260930120300_helper_functions_search_path.sql` | **dopo il deploy** | percorso di ricerca vuoto sulle sei funzioni di elenco costante (chiude sei avvisi del controllo di Supabase) |

Dopo l'ultima migrazione, le stesse prove senza applicare nulla: `node scripts/build-dry-run.mjs --only= --owners-like=%@biographylibrary.test` (solo schede di account di prova, blocco che annulla tutto). Eseguite il 1 ottobre 2026 dopo l'ottava: 54 prove su 54, catalogo invariato, nessuna traccia.

Poi: prova con un account di prova fino alla bozza PDF, **senza pubblicare** (nessun identificativo UM); dal pannello Supabase eliminare `ai-assistant` e `help-assistant` e togliere i tre segreti (sezione 3); ridistribuire `audio-transcription`; verificare che Echo, grammatica e voce rispondano e lascino righe in `ai_token_usage`. Chi ha la pagina dell'editor già aperta con il codice vecchio vedrà rifiutare alcune scritture finché non la ricarica. Se la produzione si rompe: `supabase/rollback/20260930_security_rollback.sql` (una transazione; toglie i blocchi delle migrazioni 4 e 6 e rimette le tre policy; il codice nuovo continua a funzionare perché scrive con il ruolo di servizio).

---

## 3. Variabili d’ambiente (host Next.js — es. Jelastic)

Controllare che sul **processo che esegue Next** siano impostate (non committate):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (solo server — route API tipo `/api/review/submit`, publication, ecc.)
- [ ] `INFOMANIAK_AI_ENDPOINT` / `INFOMANIAK_AI_BASE_URL`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_PRODUCT_ID`
- [ ] Modelli come in `.env.example` / `lib/agents/models.ts`: grammatica `swiss-ai/Apertus-v1.5-70B`; Echo/screening/preprint `google/gemma-4-31B-it` con ripieghi Mistral; embedding `bge_multilingual_gemma2` (non esiste più `INFOMANIAK_AI_MODEL` generico)
- [ ] `NEXT_PUBLIC_APP_URL` (URL canonico produzione)
- [ ] `UM_ID_BASE_URL` (solo server — non esiste `NEXT_PUBLIC_UM_ID_BASE_URL`)
- [ ] `CRON_SECRET` (engagement, report-deadlines, analysis-jobs, archive-packages, ai-rate-limits-cleanup)
- [ ] `NEXT_PUBLIC_APP_ENV` = `production` (se usato)

**Supabase Dashboard** (progetto produzione):

- [ ] **Auth**: conferma email attiva come da policy prodotto; redirect URL / Site URL coerenti con il dominio pubblico.
- [ ] `RESEND_API_KEY`, `RESEND_FROM_EMAIL` su Jelastic **e** secrets Edge Functions
- [ ] `CRON_SECRET`, `AUTH_HOOK_SECRET`, `ENGAGEMENT_EMAILS_ENABLED=true`
- [ ] **Auth Send Email Hook** → `auth-send-email` (disabilitare template SMTP built-in dopo verifica)
- [ ] Edge Functions email deployate: `auth-send-email`, `user-email-confirmed`, `send-engagement-emails`
- [ ] Crontab Jelastic: engagement, report-deadlines, analysis-jobs (*/10), archive-packages, ai-rate-limits-cleanup (`scripts/run-*-cron.sh`)

**Edge Functions** (secrets nel progetto Supabase):

- [ ] `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_ENDPOINT` — coerenti con host Next
- [x] Confronto delle impronte dei segreti (30 settembre 2026): `INFOMANIAK_AI_MODEL_PRIMARY`, `_FALLBACK`, `AI_RATE_LIMIT`, `AI_DAILY_LIMIT` e `AI_WEEKLY_LIMIT` coincidono con i valori predefiniti del codice: su Jelastic non c'è niente da copiare.
- [x] Grammatica: Apertus 1.5, identificativo `swiss-ai/Apertus-v1.5-70B` (verificato il 1 ottobre 2026 nel catalogo di Infomaniak: è l'unico modello Apertus). Non è un segreto di Supabase: la legge la rotta `/api/biography/[id]/grammar` su Jelastic da `INFOMANIAK_AI_MODEL_GRAMMAR`, facoltativa, con quel valore come predefinito nel codice. Se in `/opt/bl-app/.env` è impostata, deve valere l'identificativo di Apertus 1.5 o va tolta (`scripts/verify-jelastic-env.sh` ora la mostra); un valore vecchio farebbe ripiegare la grammatica su Gemma senza avvisi. Se Apertus non risponde, la rotta ripiega su Gemma e poi su Mistral Small 4. Cambio di comportamento voluto: la funzione `ai-assistant` deployata (versione 108) usava Gemma e poi Mistral.
- [ ] Eliminare dal progetto Supabase **`ai-assistant`** (versione 108) e **`help-assistant`** (versione 29, assente dal repository; sorgente conservato in `docs/legacy/help-assistant/`). Gli strumenti disponibili all'agente non possono eliminare funzioni: a mano, `supabase functions delete ai-assistant help-assistant --project-ref gckmusbozgbclokvbnwx`, o dalla dashboard.
- [ ] Togliere i segreti che nessuna funzione rimasta legge: `INFOMANIAK_AI_MODEL` (vale `mistral3`; verificato che le funzioni `audio-transcription`, `auth-send-email`, `user-email-confirmed`, `send-engagement-emails` e `log-error` non lo leggono), `INFOMANIAK_AI_MODEL_HELP_PRIMARY`, `INFOMANIAK_AI_MODEL_HELP_FALLBACK`. Facoltativi, sempre inutilizzati dopo l'eliminazione: `INFOMANIAK_AI_MODEL_PRIMARY`, `INFOMANIAK_AI_MODEL_FALLBACK`, `AI_RATE_LIMIT`, `AI_DAILY_LIMIT`, `AI_WEEKLY_LIMIT`. Comando: `supabase secrets unset <nomi> --project-ref gckmusbozgbclokvbnwx`.
- [ ] Ridistribuire `audio-transcription` **dopo** la migrazione `20260930115800_ai_token_usage.sql`: ora scrive anche in `ai_token_usage`.
- Nota: la funzione `user-email-confirmed` deployata è più vecchia di quella nel repository; non è parte del blocco 1, ma va riallineata prima o poi.

---

## 4. Deploy applicazione

- [ ] Se modificato `docs/PLATFORM_KB.md`: `npm run kb:sync` + `npm run kb:sync:check` + `POST /api/agents/admin/seed-kb` (admin) per re-indicizzare RAG Echo
- [ ] **Dopo un fix alle sezioni IT/FR/DE in `help-kb-sections.locales.ts` (e finché il reseed automatico hash-aware non è in produzione):** seed manuale esplicito per **it, fr, de** (`npm run kb:seed` o `POST /api/agents/admin/seed-kb`), altrimenti Echo continua a leggere i chunk vecchi
- [ ] Applicare la migrazione `kb_index_state` (`20261015150000_kb_index_state.sql`) in sviluppo, poi in produzione dopo revisione
- [ ] Edge Functions deployate se ci sono modifiche in `supabase/functions/` (`audio-transcription` ora scrive anche in `ai_token_usage`)
- [ ] Deploy Next: push su `main` che attiva il workflow, **oppure** procedura manuale documentata (git pull, build, restart container).
- [ ] Risposta HTTP 200 sulla homepage e su una route API leggera se disponibile.

## 4b. Condizioni per l’apertura pubblica (oltre la beta chiusa)

- [ ] **Migrazione del database Supabase in regione svizzera** (l’informativa dichiara che i dati risiedono in Svizzera) — vedi piano `.cursor/plans/supabase-zurich-migrate.plan.md`
- [ ] Gli **avvisi** di `kb:sync` sulle traduzioni KB incomplete (chiavi/versione locale dietro l’EN) diventano **blocchi** in CI prima dell’apertura pubblica
- [ ] Seed Echo allineato a `manual-meta.json` (banner admin senza drift; checklist seed it/fr/de dopo fix didascalie)

---

## 5. Smoke test — 5 flussi critici

Eseguire in **produzione** (o staging identico) con account di test dedicati.

| # | Flusso | Cosa verificare |
|---|--------|------------------|
| **1** | **Registrazione e conferma email** | Home `/` = landing lista d’attesa; accesso su `/login`. Nuovo utente → email conferma (Resend/hook, lingua browser) → link conferma → **email waitlist** → pagina `/waitlist` con **sola data di registrazione** (mai il numero in coda). |
| **2** | **Login e creazione biografia** | Account già `active`: login → dashboard o `/onboarding` se manca la biografia. Account `waitlist`: login → `/waitlist`, non il pannello. |
| **3** | **Editor e (opzionale) IA** | Apertura editor, salvataggio testo, una azione IA se i token/quota lo permettono. |
| **4** | **Verso pubblicazione (PDF)** | Revisione finale → **Start PDF phase** → copertina `cover_a5` → bozze PDF filigranate (`record-pdf-draft`) → opzionale **controllo finale** (`preprint-check`, non bloccante) → approve final PDF → screening asincrono → `published` o coda umana; `listing_cover_url` coerente. |
| **5** | **Lettura pubblica** | Biografia `published` + `public`: catalogo e/o view; edizioni via «Leggi in» / `hreflang`; oppure link **link-only** con token. |

Opzionale:

- [ ] **Admin**: login reviewer/admin → coda moderazione raggiungibile; da `/admin/users` concedere accesso a un account `waitlist` (grant in blocco).
- [ ] **Reviewer languages**: in `/admin/users`, assegnare IT a un reviewer → biografia IT in coda assegnata correttamente (`pickReviewer` + `reviewer_languages`).
- [ ] **Middleware**: `GET /api/admin/users` senza Bearer → 401; utente non-staff → 403.
- [ ] **Segnalazione errori**: verifica che `log-error` (se usato) non fallisca in modo silenzioso.

---

## 6. Dopo il go-live

- [ ] Monitoraggio prime ore (errori, log Supabase, segnalazioni utenti).
- [ ] Aggiornare questa checklist o `DEPLOYMENT.md` se cambiano host o variabili.

---

*Ultimo aggiornamento: 15 ottobre 2026 — allineato a modelli `.env.example`, cron attuali, flusso PDF senza draft-ai-review.*
