# Checklist operativa — release / beta pubblica

Usare come elenco da spuntare in team. Ordine consigliato: **merge → migrazioni prod → env → deploy → smoke test**.

---

## 0. Prima di iniziare

- [ ] Finestra di tempo concordata (comunicazione interna se serve).
- [ ] Accesso a: GitHub (merge), Supabase (produzione), host deploy (Jelastic / SSH), eventuale Resend/dashboard DNS.

---

## 1. Merge e qualità codice

- [ ] Branch di lavoro integrato in `main` — PR [#16](https://github.com/biographylibrary/Biography-Library/pull/16) (`main-sync` → `main`)
- [x] `npm run typecheck` e `npm run build` eseguiti su commit di `main-sync` (localmente)
- [x] Workflow CI (`.github/workflows/ci.yml`) — typecheck, lint, build su PR e push `main`
- [x] (Opzionale ma consigliato) `npm run lint` — PASS

---

## 2. Migrazioni database (Supabase **produzione**)

- [x] Migrazioni v1 applicate su Supabase dev (`20260508_add_draft_ai_feedback_to_biographies`, `20260508120000_biography_media_cover_a5_layout`, `20260508180000_biography_book_structure_author_copyright_page`)
- [x] Migrazione agenti: `agent_tables` (thread, messaggi, RAG, `agent_usage`) su progetto dev `gckmusbozgbclokvbnwx`
- [ ] Stesse migrazioni applicate su Supabase **produzione** (se progetto separato da dev)

---

## 3. Variabili d’ambiente (host Next.js — es. Jelastic)

Controllare che sul **processo che esegue Next** siano impostate (non committate):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (solo server — route API tipo `/api/review/submit`, publication, ecc.)
- [ ] `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_MODEL` = `google/gemma-4-31B-it` (screening lato route Next)
- [ ] `NEXT_PUBLIC_APP_URL` (URL canonico produzione, es. `https://…`)
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
- [x] `INFOMANIAK_AI_MODEL_PRIMARY` = `google/gemma-4-31B-it`, `INFOMANIAK_AI_MODEL_FALLBACK` = `mistralai/Mistral-Small-4-119B-2603` (ai-assistant)
- [x] `INFOMANIAK_AI_MODEL_HELP_PRIMARY` = `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8`, `INFOMANIAK_AI_MODEL_HELP_FALLBACK` = `mistralai/Ministral-3-14B-Instruct-2512` (help-assistant)
- [x] Edge Functions `ai-assistant` (v89) e `help-assistant` (v19) deployate con nuovi modelli

---

## 4. Deploy applicazione

- [ ] Se modificato `docs/PLATFORM_KB.md`: `npm run kb:sync` + `npm run kb:sync:check` + `POST /api/agents/admin/seed-kb` (admin) per re-indicizzare RAG Echo
- [ ] Edge Functions deployate se ci sono modifiche in `supabase/functions/` (incluso `ai-assistant` per limiti staff)
- [ ] Deploy Next: push su `main` che attiva il workflow, **oppure** procedura manuale documentata (git pull, build, restart container).
- [ ] Risposta HTTP 200 sulla homepage e su una route API leggera se disponibile.

---

## 5. Smoke test — 5 flussi critici

Eseguire in **produzione** (o staging identico) con account di test dedicati.

| # | Flusso | Cosa verificare |
|---|--------|------------------|
| **1** | **Registrazione e conferma email** | Nuovo utente → email conferma (Resend/hook, lingua browser) → link conferma → **email benvenuto** → accesso ok. |
| **2** | **Login e creazione biografia** | Login → dashboard → crea biografia → salvataggio base (titolo, modalità). |
| **3** | **Editor e (opzionale) IA** | Apertura editor, salvataggio testo, una azione IA se i token/quota lo permettono. |
| **4** | **Verso pubblicazione (PDF)** | Final review → **Start PDF phase** (`start-pdf-draft`) → upload `cover_a5` + toggle copyright page → export draft PDF (round 1–3) → **`draft-ai-review`** salva feedback → approve final PDF → screening → `published` o `under_review`; stati e `listing_cover_url` coerenti. |
| **5** | **Lettura pubblica** | Biografia `published` + `public`: comparsa in elenco pubblico e/o pagina view; oppure link **link-only** con token. |

Opzionale:

- [ ] **Admin**: login reviewer/admin → coda moderazione raggiungibile.
- [ ] **Reviewer languages**: in `/admin/users`, assegnare IT a un reviewer → biografia IT in coda assegnata correttamente (`pickReviewer` + `reviewer_languages`).
- [ ] **Middleware**: `GET /api/admin/users` senza Bearer → 401; utente non-staff → 403.
- [ ] **Segnalazione errori**: verifica che `log-error` (se usato) non fallisca in modo silenzioso.

---

## 6. Dopo il go-live

- [ ] Monitoraggio prime ore (errori, log Supabase, segnalazioni utenti).
- [ ] Aggiornare questa checklist o `DEPLOYMENT.md` se cambiano host o variabili.

---

*Ultimo aggiornamento: allineato a conferma email + SMTP custom in produzione.*
