# Checklist operativa — release / beta pubblica

Usare come elenco da spuntare in team. Ordine consigliato: **merge → migrazioni prod → env → deploy → smoke test**.

---

## 0. Prima di iniziare

- [ ] Finestra di tempo concordata (comunicazione interna se serve).
- [ ] Accesso a: GitHub (merge), Supabase (produzione), host deploy (Jelastic / SSH), eventuale Resend/dashboard DNS.

---

## 1. Merge e qualità codice

- [ ] Branch di lavoro integrato in `main` (es. PR approvata, **nessun marker di conflitto** `<<<<<<<` nel repo).
- [ ] `npm run typecheck` e `npm run build` eseguiti su commit di `main` (localmente o in CI).
- [ ] (Opzionale ma consigliato) `npm run lint` — il build Next può ignorare ESLint; il lint va eseguito esplicitamente.

---

## 2. Migrazioni database (Supabase **produzione**)

- [ ] Elenco migrazioni da applicare allineato a `supabase/migrations/` su `main`.
- [ ] Migrazioni applicate **in ordine di timestamp** (dashboard SQL / CLI / strumento interno).
- [ ] Verifica rapida post-migrazione (a campione): colonne nuove su `biographies`, funzione `get_biography_by_share_token` aggiornata se previsto, bucket storage esistente.

---

## 3. Variabili d’ambiente (host Next.js — es. Jelastic)

Controllare che sul **processo che esegue Next** siano impostate (non committate):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (solo server — route API tipo `/api/review/submit`, publication, ecc.)
- [ ] `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_MODEL` (screening lato route Next)
- [ ] `NEXT_PUBLIC_APP_URL` (URL canonico produzione, es. `https://…`)
- [ ] `NEXT_PUBLIC_APP_ENV` = `production` (se usato)

**Supabase Dashboard** (progetto produzione):

- [ ] **Auth**: conferma email attiva come da policy prodotto; redirect URL / Site URL coerenti con il dominio pubblico.
- [ ] **SMTP custom** (es. Resend) operativo per `biographylibrary.org`.

**Edge Functions** (secrets nel progetto Supabase):

- [ ] `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_ENDPOINT`, modelli se usati — coerenti con `DEPLOYMENT.md`.

---

## 4. Deploy applicazione

- [ ] Edge Functions deployate se ci sono modifiche in `supabase/functions/` (ai-assistant, audio-transcription, help-assistant, log-error).
- [ ] Deploy Next: push su `main` che attiva il workflow, **oppure** procedura manuale documentata (git pull, build, restart container).
- [ ] Risposta HTTP 200 sulla homepage e su una route API leggera se disponibile.

---

## 5. Smoke test — 5 flussi critici

Eseguire in **produzione** (o staging identico) con account di test dedicati.

| # | Flusso | Cosa verificare |
|---|--------|------------------|
| **1** | **Registrazione e conferma email** | Nuovo utente → riceve email (Resend / dominio corretto) → link conferma → accesso ok. |
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
