# Checklist operativa — release / beta pubblica

Usare come elenco da spuntare in team. Ordine consigliato: **merge → migrazioni prod → env → deploy → smoke test**.

---

## 0. Prima di iniziare

- [ ] Finestra di tempo concordata (comunicazione interna se serve).
- [ ] Accesso a: GitHub (merge), Supabase (produzione), host deploy (Jelastic / SSH), eventuale Resend/dashboard DNS.

---

## 1. Merge e qualità codice

- [ ] Branch di lavoro integrato in `main` (la PR #16 è già chiusa; non è più il punto di partenza)
- [x] `npm run typecheck` e `npm run build` eseguiti su commit di `main-sync` (localmente)
- [x] Workflow CI (`.github/workflows/ci.yml`) — typecheck, lint, build su PR e push `main`
- [x] (Opzionale ma consigliato) `npm run lint` — PASS

---

## 2. Migrazioni database (Supabase **produzione**)

- [x] Migrazioni v1 applicate su Supabase dev (`20260508_add_draft_ai_feedback_to_biographies`, `20260508120000_biography_media_cover_a5_layout`, `20260508180000_biography_book_structure_author_copyright_page`)
- [x] Migrazione agenti: `agent_tables` (thread, messaggi, RAG, `agent_usage`) su progetto dev `gckmusbozgbclokvbnwx`
- [ ] Stesse migrazioni applicate su Supabase **produzione** (se progetto separato da dev)

**Blocco 1 (ramo `blocco-1-strumenti-ai`), cinque migrazioni nuove. Non applicarle senza conferma esplicita.** Ordine consigliato, perché il codice nuovo ha bisogno di due tabelle e quello vecchio non sopporta i blocchi:

1. *Prima del deploy, sono solo aggiunte e non toccano il codice vecchio*: `20260930120200_publication_records.sql` (il registro delle impronte: senza, lo screening del codice nuovo non può scrivere la propria traccia e non pubblica) e `20260930120300_ai_token_usage.sql` (registro dei consumi e tetti).
2. Deploy del codice (merge su `main`).
3. *Dopo il deploy, sono le restrittive*: `20260930115900_align_biographies_profiles_triggers.sql` (a parità, non cambia nulla), `20260930120000_server_only_columns_and_reports.sql` (colonne riservate al server, tolte due policy di INSERT), `20260930120100_author_text_whitelist.sql` (il testo solo negli stati di lavoro). Chi ha la pagina dell'editor già aperta con il codice vecchio vedrà rifiutare alcune scritture finché non la ricarica.
4. Prova in produzione con un account di prova, **fermandosi prima della pubblicazione** (nessun identificativo UM): registrazione, onboarding, creazione della scheda, scrittura, versione finale, bozza PDF. Verificare che i passaggi bloccati siano rifiutati e quelli di lavoro no.
5. Solo dopo la conferma: azioni su Supabase (sezione 3, Edge Functions).
6. Se la produzione si rompe: `supabase/rollback/20260930_security_rollback.sql`, una transazione, riporta trigger e policy com'erano (provato sul banco). Il codice nuovo continua a funzionare perché scrive con il ruolo di servizio.

---

## 3. Variabili d’ambiente (host Next.js — es. Jelastic)

Controllare che sul **processo che esegue Next** siano impostate (non committate):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (solo server — route API tipo `/api/review/submit`, publication, ecc.)
- [ ] `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `AGENT_MODEL_REVIEWER` / `INFOMANIAK_AI_MODEL_PRIMARY` as in `.env.example` (screening on Next routes; there is no `INFOMANIAK_AI_MODEL`)
- [ ] `NEXT_PUBLIC_APP_URL` (URL canonico produzione, es. `https://…`)
- [ ] `UM_ID_BASE_URL` (solo server — URL del risolutore UM; non esiste `NEXT_PUBLIC_UM_ID_BASE_URL`)
- [ ] `NEXT_PUBLIC_APP_ENV` = `production` (se usato)

**Supabase Dashboard** (progetto produzione):

- [ ] **Auth**: conferma email attiva come da policy prodotto; redirect URL / Site URL coerenti con il dominio pubblico.
- [ ] `RESEND_API_KEY`, `RESEND_FROM_EMAIL` su Jelastic **e** secrets Edge Functions
- [ ] `CRON_SECRET`, `AUTH_HOOK_SECRET`, `ENGAGEMENT_EMAILS_ENABLED=true`
- [ ] **Auth Send Email Hook** → `auth-send-email` (disabilitare template SMTP built-in dopo verifica)
- [ ] Edge Functions email deployate: `auth-send-email`, `user-email-confirmed`, `send-engagement-emails`
- [ ] Cron giornaliero su `send-engagement-emails`

**Edge Functions** (secrets nel progetto Supabase):

- [ ] `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_ENDPOINT` — coerenti con host Next
- [x] Confronto delle impronte dei segreti (30 settembre 2026): `INFOMANIAK_AI_MODEL_PRIMARY`, `_FALLBACK`, `AI_RATE_LIMIT`, `AI_DAILY_LIMIT` e `AI_WEEKLY_LIMIT` coincidono con i valori predefiniti del codice: su Jelastic non c'è niente da copiare.
- [x] `INFOMANIAK_AI_MODEL_GRAMMAR` = `swiss-ai/Apertus-v1.5-70B` (se non risponde, la rotta ripiega su Gemma e poi su Mistral Small 4). Cambio di comportamento voluto: la funzione `ai-assistant` deployata (versione 108) usava Gemma e poi Mistral.
- [ ] Eliminare dal progetto Supabase **`ai-assistant`** (versione 108) e **`help-assistant`** (versione 29, assente dal repository; sorgente conservato in `docs/legacy/help-assistant/`). Gli strumenti disponibili all'agente non possono eliminare funzioni: a mano, `supabase functions delete ai-assistant help-assistant --project-ref gckmusbozgbclokvbnwx`, o dalla dashboard.
- [ ] Togliere i segreti che nessuna funzione rimasta legge: `INFOMANIAK_AI_MODEL` (vale `mistral3`; verificato che le funzioni `audio-transcription`, `auth-send-email`, `user-email-confirmed`, `send-engagement-emails` e `log-error` non lo leggono), `INFOMANIAK_AI_MODEL_HELP_PRIMARY`, `INFOMANIAK_AI_MODEL_HELP_FALLBACK`. Facoltativi, sempre inutilizzati dopo l'eliminazione: `INFOMANIAK_AI_MODEL_PRIMARY`, `INFOMANIAK_AI_MODEL_FALLBACK`, `AI_RATE_LIMIT`, `AI_DAILY_LIMIT`, `AI_WEEKLY_LIMIT`. Comando: `supabase secrets unset <nomi> --project-ref gckmusbozgbclokvbnwx`.
- [ ] Ridistribuire `audio-transcription` **dopo** la migrazione `20260930120300_ai_token_usage.sql`: ora scrive anche in `ai_token_usage`.
- Nota: la funzione `user-email-confirmed` deployata è più vecchia di quella nel repository; non è parte del blocco 1, ma va riallineata prima o poi.

---

## 4. Deploy applicazione

- [ ] Se modificato `docs/PLATFORM_KB.md`: `npm run kb:sync` + `npm run kb:sync:check` + `POST /api/agents/admin/seed-kb` (admin) per re-indicizzare RAG Echo
- [ ] Edge Functions deployate se ci sono modifiche in `supabase/functions/` (`audio-transcription` ora scrive anche in `ai_token_usage`)
- [ ] Deploy Next: push su `main` che attiva il workflow, **oppure** procedura manuale documentata (git pull, build, restart container).
- [ ] Risposta HTTP 200 sulla homepage e su una route API leggera se disponibile.

---

## 5. Smoke test — 5 flussi critici

Eseguire in **produzione** (o staging identico) con account di test dedicati.

| # | Flusso | Cosa verificare |
|---|--------|------------------|
| **1** | **Registrazione e conferma email** | Home `/` = landing lista d’attesa; accesso su `/login`. Nuovo utente → email conferma (Resend/hook, lingua browser) → link conferma → **email waitlist** → pagina `/waitlist` con **sola data di registrazione** (mai il numero in coda). |
| **2** | **Login e creazione biografia** | Account già `active`: login → dashboard o `/onboarding` se manca la biografia. Account `waitlist`: login → `/waitlist`, non il pannello. |
| **3** | **Editor e (opzionale) IA** | Apertura editor, salvataggio testo, una azione IA se i token/quota lo permettono. |
| **4** | **Verso pubblicazione (PDF)** | Final review → **Start PDF phase** (`start-pdf-draft`) → upload `cover_a5` + toggle copyright page → export draft PDF (round 1–3) → **`draft-ai-review`** salva feedback → approve final PDF → screening → `published` o `under_review`; stati e `listing_cover_url` coerenti. |
| **5** | **Lettura pubblica** | Biografia `published` + `public`: comparsa in elenco pubblico e/o pagina view; oppure link **link-only** con token. |

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

*Ultimo aggiornamento: 21 settembre 2026 — lista d’attesa beta, `UM_ID_BASE_URL`, nomi modello AI allineati a `.env.example`.*
