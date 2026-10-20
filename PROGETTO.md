# Biography Library — stato del progetto

> Contesto per sessioni nuove: prodotto com’è oggi, decisioni fisse, debiti aperti.
> Aggiornare quando cambia l’architettura o si chiude un debito. Non elencare pull request già unite.

---

## Cos’è

Piattaforma open-source della Biography Library Association per scrivere, moderare e pubblicare biografie personali (autobiografia o memorial) in più lingue. Un account = una biografia originale; le traduzioni sono edizioni collegate (`translation_of`).

Fondatore unico, non sviluppatore: lavora con Cursor / Claude. Preferenza per servizi gestiti.

**Stack**: Next.js 13.5 (App Router) · Supabase (Postgres, Auth, Storage, pgvector) · container Docker su Infomaniak Jelastic · Infomaniak AI Services (LLM) · Mistral (solo TTS Echo).

La piattaforma è chiusa in beta: le biografie pubblicate sono schede di prova. Lista d’attesa sulla home `/`; accesso su `/login`.

---

## Stato attuale (15 ottobre 2026)

### Scrittura

- Documento unico (foglio libero). Le schede storiche in modalità sezioni restano leggibili; l’interfaccia le tratta come foglio unico.
- Originale conservato: **Markdown CommonMark UTF-8 (NFC)**. L’HTML è solo resa (`storedToSafeHtml` / TipTap). Separatore di scena: `***`.
- Editor TipTap 3.19: caricamento via `archiveMarkdownToEditorHtml` (non `contentType: markdown`); salvataggio con `htmlToArchiveMarkdown` in `lib/archive-markdown.ts`. Estensione `@tiptap/markdown` ancora registrata (prova di regressione sul bug TipTap dopo elenchi).
- Guardia di caricamento: se il testo ricostruito non coincide col salvato, sola lettura e messaggio nelle quattro lingue (`editor.loadTextLostReadOnly`).
- Permanenza: eventi, relazioni, luoghi, licenza, identificativo UM.
- Galleria foto fino a 15 immagini per biografia; il file si controlla e si comprime sul server prima di salvarlo
- Parti del libro (dedica, epigrafe, prefazione, epilogo, ringraziamenti, crediti) in lettura, PDF, archivio, esporti e screening.

### Intelligenza artificiale

Quattro usi sul testo dell’autore: **Echo** (struttura, bozze, guida piattaforma), **grammatica** su richiesta, **controllo finale** prima della stampa (`preprint_check`, non bloccante), **screening** di conformità alla pubblicazione (moderazione).

| Funzione | Scopo `ai_token_usage` | Modello (default codice / `.env.example`) | Ripiego |
|---|---|---|---|
| Echo | `echo` | `google/gemma-4-31B-it` (`AGENT_MODEL_ONBOARDING`) | `mistralai/Ministral-3-14B-Instruct-2512` |
| Grammatica | `grammar` | `swiss-ai/Apertus-v1.5-70B` | Gemma 4 31B → Mistral Small 4 |
| Controllo finale | `preprint_check` | `google/gemma-4-31B-it` | — |
| Screening | `screening` | `google/gemma-4-31B-it` (`AGENT_MODEL_REVIEWER`) | `mistralai/Mistral-Small-4-119B-2603` |
| Embedding RAG | `embedding` | `bge_multilingual_gemma2` (3584 dim) | lo stesso |
| STT Echo | `transcription` (byte) | Whisper (Edge Function) | — |
| TTS Echo | `tts` (caratteri) | Voxtral via Mistral | — |

Client unico: `lib/agents/infomaniak-client.ts` → riga in `ai_token_usage`. Eccezioni: Whisper (Edge) e TTS Mistral.

Tetti autore (`ai_author_token_limits`, Europe/Zurich): 400 000 / giorno, 1 500 000 / settimana, 4 000 000 / mese; contano solo `echo` e `grammar`. Staff esente ma registrato.

Screening a pezzi sull’intero testo pubblico dell’impronta (`assembleScreeningText`): pezzo massimo 23 863 token / 95 452 caratteri; lavori asincroni (`analysis_jobs`); caduti → coda umana (`routeScreeningFailureToManualReview` + cron `POST /api/cron/analysis-jobs`).

### Pubblicazione e archivio

- Flusso: bozza → revisione finale → bozze PDF filigranate → approvazione → screening → `published` o coda umana.
- Scritture fuori Latn/Cyrl/Grek: `approve-text` senza PDF.
- Impronta SHA-256 del testo pubblico; pubblicazione solo via `gatedPublish`.
- Pacchetto `archive/{UM}/v{N}/`: autobiografia alla pubblicazione; memorial dopo `provisional_until`; edizioni come `biography.<lingua>.md`. Cron `POST /api/cron/archive-packages`.
- Cron giornaliero `POST /api/cron/ai-rate-limits-cleanup` → `cleanup_ai_rate_limits_30d` (solo `ai_rate_limits`, mai `ai_token_usage`).

### Edizioni (traduzioni dell’autore)

- Una riga `biographies` con `translation_of`; al massimo una lingua per opera; `record_language_tag` obbligatorio.
- La piattaforma non traduce. Niente Echo né grammatica sull’edizione.
- Catalogo: una scheda per opera; «Leggi in» e `hreflang` sulla lettura.
- Fatti di vita dalle uscite: dall’originale, etichette standard nella lingua UI dell’edizione.
- Foto dell’originale; didascalie da `biography_edition_captions`.

### Infrastruttura

- Deploy: push su `main` → GitHub Actions → Jelastic. Integrazione sempre via PR.
- 5 Edge Functions: `audio-transcription`, `auth-send-email`, `log-error`, `send-engagement-emails`, `user-email-confirmed`.
- Ruoli staff unici: `lib/server/staff-roles.ts` (`reviewer`, `admin`, `super_admin`).

---

## Decisioni di prodotto fissate

- Nessun self-hosting GPU in Fase 1; inferenza su Infomaniak gestito.
- Supabase per DB/auth/storage fino alla Fase 2 (Public Cloud Infomaniak, rinviata).
- Streaming agenti su runtime Node.
- Alla pubblicazione: purge memoria Echo / chunk RAG di quella biografia; `ai_token_usage` resta.
- Testo scrivibile solo negli stati dell’elenco chiuso (`AUTHOR_TEXT_WRITABLE_STATUSES` ↔ SQL).
- Identificativo UM permanente, specifica pubblica; mai riciclato; mai 404 su ID emesso.
- Licenza contenuto: BY-NC-SA default / BY-SA; metadati CC0.
- Memorial: niente stato `provisional`; finestra `provisional_until` (30 giorni); segnalazione sempre possibile.
- Formato di riferimento: Markdown; PDF è una resa.
- Versioni d’archivio già depositate: non si riscrivono.

---

## Debiti noti (aperti)

### Archivi e edizioni

- **Corsa residua** fra cron e pubblicazione: la guardia `archive_version_conflict` restringe ma non elimina del tutto.
- **N+1** in `syncDueArchivePackages`: una query versioni per ogni originale (accettabile oggi).
- **Ritiro di un’edizione pubblicata**: percorso assente.
- **Scala catalogo**: `fetchPublicLanguageTags` non è un distinct reale e ha tetto PostgREST 1000; `fetchPublicEditionsOf` allunga l’URL con molti id.

### Formato e dati

- **Conversione HTML → Markdown reale** ancora in attesa (`npm run markdown:legacy -- --apply`). `biography_source_html_legacy` tiene l’HTML 180 giorni; `content_html_legacy` in produzione è vuota — da eliminare insieme dopo i 180 giorni dalla conversione.
- **`revision_history` su `biography_sections`**: colonna e helper morti (la revisione AI per sezione è tolta); colonna rimossa il 20 ottobre 2026.
- **PDF non latino**: jsPDF senza subsetting Noto adeguato; serve altro motore.
- **Metadati pagina di lettura**: oltre agli `alternates`, mancano titolo/descrizione dedicati.
- **Sitemap XML** delle biografie pubbliche: assente.

### Bucket foto

- **Porta larga su `biography_media`**: il browser può ancora fare INSERT e UPDATE sulla riga (policy con solo `user_id = auth.uid()`), quindi un autore può scrivere un `file_url` a piacere — un indirizzo falso in galleria, non un file nel bucket. Tracciato in `docs/SICUREZZA-SCRITTURE-ELENCO.md`.
- **`allowed_mime_types` assente**: il bucket `biography-photos` non ha ancora un elenco di tipi ammessi. Ora che nessun browser scrive i file (solo la rotta server), si può impostare a `image/jpeg` senza rischiare il flusso.
- **Limite nginx non verificato**: il bucket ha `file_size_limit` 20 MiB (`20261006120000`), ma sul nodo Jelastic non si è mai controllato `client_max_body_size` di nginx davanti all’app. Se restasse il predefinito da 1 MB, una foto grande darebbe un errore poco chiaro. Controllo: sul nodo, `grep -r client_max_body_size /etc/nginx`; nessun valore significa 1 MB.

### Email e Edge

- **`shared/email` / Edge Functions**: `render.ts` importa `@/lib/um` (alias Next); lo script di packaging di giugno non lo risolve. `send-engagement-emails` in produzione con file condivisi vecchi + `index.ts` aggiornato. Da portare a rotte Node o riparare il bundle.
- **Voxtral TTS**: voice ID IT/FR/DE da completare in `.env` (EN ok).

### Sicurezza / DB (tracciati, non in questo blocco)

- Percorso di ricerca dei sei trigger su `biographies` (`function_search_path_mutable`): proposta `SET search_path = ''` con prova su banco.
- Privilegi residui `TRUNCATE`/`TRIGGER`/`REFERENCES` per `anon`/`authenticated` sulle tabelle `public`.

### Migrazione piattaforma

- **Fase 2 Infomaniak Public Cloud**: non iniziata; richiede aiuto professionale (Postgres+pgvector, k8s, S3, auth).

---

## Variabili d’ambiente (riepilogo)

Elenco documentato: `.env.example` (verificato da `npm run check:env`). Critiche: Supabase, `INFOMANIAK_AI_*`, modelli facoltativi come sopra, `CRON_SECRET`, Resend, `UM_ID_BASE_URL`, voice Echo, secret SSH Jelastic solo in GitHub Actions (non in `.env.example`).

Cron Jelastic tipici: engagement, report-deadlines, analysis-jobs (*/10), archive-packages, **ai-rate-limits-cleanup** (`15 3 * * * …/run-ai-rate-limits-cleanup-cron.sh`).

---

## Struttura rilevante

```
app/api/agents/          Echo SSE, TTS
app/api/publication/     PDF, preprint, approve
app/api/cron/            analysis-jobs, archive-packages, report-deadlines, ai-rate-limits-cleanup
app/api/biography/       grammatica, edizioni, foto, parti libro
lib/agents/              Echo, screening, client Infomaniak, modelli
lib/archive-markdown.ts  serializzatore d’archivio
lib/server/staff-roles.ts  unica fonte ruoli staff
supabase/migrations/     schema timestampato
supabase/functions/      5 Edge Functions
```

---

*Ultimo aggiornamento: 15 ottobre 2026 (blocco 6 — pulizia)*
