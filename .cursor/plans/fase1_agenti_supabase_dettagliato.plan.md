---
name: Fase 1 dettagliata, agenti AI conversazionali su Supabase
overview: "Piano di implementazione eseguibile da Cursor per la beta, aderente al codice attuale di Biography Library. Si resta su Supabase (database, auth, storage, pgvector nativo) e sull'hosting attuale; si cambiano i modelli verso google/gemma-4-31B-it (coach e reviewer) e nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8 (onboarding), inferenza su Infomaniak AI Services; si costruiscono agenti conversazionali in streaming come route Next.js, riusando il pattern di autenticazione e di chiamata Infomaniak gia presenti nel codice. Niente migrazione, niente Kubernetes, niente sostituzione auth: quello e Fase 2. Ordine: prima il coach."
todos:
  - id: s0-swap-modelli
    content: "Step 0: swap modelli + spike GET /models + fix smart-followup action analyze-answer"
    status: completed
  - id: s1-registro-client
    content: "Step 1: lib/agents/models.ts + infomaniak-client.ts (stream, embed); verificare dimensioni embedding prima dello Step 2"
    status: completed
  - id: s2-schema-agenti
    content: "Step 2: migrazione agent_threads, agent_messages, agent_memory_facts, biography_chunks, kb_chunks, agent_usage"
    status: completed
  - id: s3-gateway
    content: "Step 3: gateway SSE + tool loop + rate limit agent_usage + onboarding minimo (smoke E2E)"
    status: completed
  - id: s4-agentchat
    content: "Step 4: components/agents/AgentChat.tsx streaming + evento tool_result per refresh editor"
    status: completed
  - id: s5-coach
    content: "Step 5: coach Gemma (solo biography_mode=sections), 4 tool, propose_draft con sync editor"
    status: completed
  - id: s6-rag
    content: "Step 6: RAG biography_chunks + indexBiography/retrieve"
    status: completed
  - id: s6b-purge
    content: "Step 6b: purgeAgentMemoryOnPublished su transizione a published"
    status: completed
  - id: s7-onboarding
    content: "Step 7: onboarding Nemotron completo + kb_chunks multilingue + sostituisce HelpChatbot"
    status: completed
  - id: s8-reviewer
    content: "Step 8: reviewer Gemma + convergenza review-submit-pipeline"
    status: completed
  - id: s9-apertus
    content: "Step 9: rilettura Apertus opzionale"
    status: completed
isProject: false
---

# Fase 1 dettagliata per Cursor: agenti AI su Supabase

Piano di implementazione per la beta, da eseguire con Cursor. E la Fase 1 del piano strategico in `piano_tecnico_modelli_e_migrazione_jelastic.plan.md` (documento esterno al repo, se assente usare questo file come riferimento). La migrazione svizzera totale e la Fase 2, con aiuto professionale, e non e qui.

## Decisioni confermate

| Decisione | Scelta |
| --- | --- |
| Stack beta | **Supabase** (DB, auth, storage); inferenza e route agenti su **Next.js/Jelastic** |
| Migrazione Jelastic totale | **Fase 2** — non in questo piano |
| Memoria coach/reviewer | Attiva fino a **`published`**, poi **cancellazione completa** (Step 6b) |
| Coach in beta | Solo **`biography_mode = sections`**; freeflow **escluso** (messaggio che invita a usare modalita sezioni) |
| Modelli | Gemma coach/reviewer, Nemotron onboarding; verificare slug live con `GET /models` in Step 0 |

## Regole della fase

Si resta su Supabase: database, autenticazione, storage. Niente migrazione, niente PostgreSQL autogestito, niente Kubernetes, niente sostituzione dell'auth. Tutto cio che segue e additivo: si aggiungono route, componenti e tabelle, senza smontare cio che funziona. L'inferenza resta su Infomaniak AI Services. Le nuove route girano sul runtime Node di Next.js, che regge lo streaming. [Certo] Verificato che oggi non esiste streaming nel codice e che `next.config.js` non forza un runtime edge.

## Mappa del codice attuale, riferimenti verificati

Questi sono i punti reali del codice su cui il piano si innesta. Cursor deve leggerli prima di iniziare.

Autenticazione lato server, gia in uso nelle route: `lib/server/admin-api-auth.ts:7-14` costruisce un client Supabase anonimo con il token dell'utente (`buildUserClient(jwt)`); `lib/server/admin-api-auth.ts:22-44` ricava `{ userId, role }` con `auth.getUser()` piu lettura di `profiles.role`; il pattern completo di una route protetta e in `app/api/publication/draft-ai-review/route.ts:21-99` (legge `Authorization: Bearer <jwt>`, verifica, poi logica). Il client con privilegi di servizio e `buildServiceClient()` in `lib/server/review-submit-pipeline.ts:41-45`.

Chiamata Infomaniak lato server, da cui copiare il pattern: variabili in `lib/server/review-submit-pipeline.ts:4-7` (`INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_MODEL`); fetch in `:385-401` con corpo `{ model, max_tokens, temperature, messages }`; parsing della risposta in `:403-416` leggendo `aiJson.choices[0].message.content`.

Modelli cablati, da cambiare in Step 0: `supabase/functions/ai-assistant/index.ts:20-21`, `supabase/functions/help-assistant/index.ts:323-324`, `lib/server/review-submit-pipeline.ts:6-7`, e `supabase/functions/audio-transcription/index.ts:101` (whisper, da non toccare).

Modello dei contenuti, su cui agiscono gli strumenti del coach: chiavi delle 9 sezioni e tipo `SectionData { text, todo, audioTranscript }` in `lib/editor-constants.ts`; interfaccia `Biography` in `lib/biographies.ts:6-35` con `content` (jsonb) usato in modalita sezioni e `content_freeflow` (testo) in modalita libera, piu `biography_mode` e `status`; stati di pubblicazione in `lib/publication-state.ts:6-15`.

Percorso con cui oggi si genera e si salva una bozza, da replicare nello strumento `propose_draft`: il callback `onGenerateDraft(answers)` e implementato in `app/biography/[id]/edit/page.tsx:866-930`; concatena le risposte e le aggiunge in coda a `content[activeSection].text` (modalita append) via `setContent`, poi `markDirty` fa partire il salvataggio automatico che esegue `update({ title, visibility, content, biography_mode, content_freeflow, author_name }).eq('id', id)` (`:336-350`). La bozza quindi finisce in `biographies.content[sectionKey].text`, NON in `biography_sections`.

Stato e avanzamento delle sezioni: `biography_sections` tiene solo i metadati (stato `in_progress|draft_1|draft_2|draft_3|approved|locked`, `draft_version`, `revision_history`), gestiti da `lib/section-status-service.ts:24-69` con upsert su conflitto `(biography_id, section_key)`. Il completamento e in `section_completions`, gestito da `lib/section-completion-service.ts`: `markSectionComplete(userId, biographyId, sectionKey)` (`:12-32`) e `getCompletedSections(biographyId)` (`:50-64`); la percentuale e completate diviso 9.

Conversazione attuale e checkpoint, che il coach sostituisce: `components/editor/conversation-mode.tsx` guida domande fisse e non fa streaming; `lib/ai/smart-followup.ts` invia `action: 'followup'` ma l'edge function accetta solo `analyze-answer` — **bug da correggere in Step 0** (o deprecare quando il coach e attivo); `lib/checkpoint-service.ts:26-174` salva, carica e cancella i checkpoint nella tabella `conversation_checkpoints`.

Internazionalizzazione: contesto client in `lib/i18n/i18n-context.tsx`, lingue `en|it|fr|de`. Lato server non c'e rilevamento lingua: si passa `language` nel corpo della richiesta, con fallback su `profiles.language`.

Base di conoscenza dell'aiuto, che l'onboarding mette in RAG: `lib/help/help-kb.ts`, oggi statica e solo in inglese.

Struttura del libro, utile al reviewer: `biography_book_structure`, con dedica, epigrafe, prefazione, epilogo, ringraziamenti, crediti, piu i relativi interruttori.

Hook publish per purge memoria: `app/api/review/submit/route.ts` (auto-publish), `app/api/publication/approve-final-pdf/route.ts` (screening post-PDF), entrambi convergono su `runReviewSubmitScreening` in `lib/server/review-submit-pipeline.ts` quando `status` diventa `published`. Path admin diretti: `components/admin/ModerationDetailPanel.tsx` e `components/admin/BiographyDetailPanel.tsx` (impostano `status: 'published'` senza passare dal pipeline).

## Variabili d'ambiente

Esistenti, da riusare: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_MODEL`.

Da aggiungere: `INFOMANIAK_AI_BASE_URL` (radice OpenAI-compatibile, es. `https://api.infomaniak.com/2/ai/{product_id}/openai/v1`); `AGENT_MODEL_COACH`, `AGENT_MODEL_REVIEWER`, `AGENT_MODEL_ONBOARDING`, `AGENT_MODEL_APERTUS`, ciascuna con `*_FALLBACK`; `AGENT_EMBEDDING_MODEL`; `AGENT_DAILY_LIMIT` (default 80 turni/utente/giorno, separato da `ai_usage_tracking` toolbar); `AGENT_BURST_LIMIT` (default 10 req/min/utente).

---

## Step 0: cambio modelli, spike catalogo, fix follow-up

Obiettivo: migliorare subito le funzioni AI esistenti e sbloccare prerequisiti tecnici.

### 0a — Spike obbligatorio (prima di qualsiasi migrazione DB)

1. `GET {INFOMANIAK_AI_BASE_URL}/models` — confermare slug esatti.
2. Una chiamata `POST .../embeddings` con `bge_multilingual_gemma2` — annotare **numero dimensioni** (atteso 3584) per Step 2.

### 0b — Swap modelli

| File | Da | A |
| --- | --- | --- |
| `supabase/functions/ai-assistant/index.ts` | Apertus, `mistral3` | `google/gemma-4-31B-it` / `mistralai/Mistral-Small-4-119B-2603` |
| `supabase/functions/help-assistant/index.ts` | Apertus, `mistral3` | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8` / `mistralai/Ministral-3-14B-Instruct-2512` |
| `lib/server/review-submit-pipeline.ts` | default Apertus | default `google/gemma-4-31B-it` |
| `supabase/functions/audio-transcription/index.ts` | `whisper` | invariato |

Nota Nemotron: slug `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8` (prefisso NVIDIA raddoppiato e corretto).

### 0c — Fix `smart-followup`

In `lib/ai/smart-followup.ts` cambiare `action: 'followup'` in `action: 'analyze-answer'` per allinearsi a `supabase/functions/ai-assistant/index.ts`. Mantiene `conversation-mode` funzionante finche il coach non lo sostituisce.

Criterio di accettazione Step 0: funzioni esistenti OK con nuovi modelli; embedding dimensioni note; follow-up conversazione legacy non cade piu nel fallback statico.

---

## Step 1: registro modelli e client Infomaniak in streaming

Obiettivo: un solo punto per i modelli e un solo client che sa fare streaming.

Creare `lib/agents/models.ts` (ruoli, parametri per modello, cache `/models`, override env).

Creare `lib/agents/infomaniak-client.ts`: `chat()` non-stream, `chatStream()` SSE, `embed(texts)`, supporto `tools` / `tool_choice`. Parametri legati al modello (es. no `thinking` su alias `mistral3`).

Criterio di accettazione: streaming manuale con token progressivi; `embed` restituisce vettore con dimensioni confermate in Step 0.

---

## Step 2: schema agenti su Supabase

Obiettivo: tabelle per thread, messaggi, memoria, RAG biografia, RAG help, quota agenti.

`create extension if not exists vector;`

**Dimensioni embedding:** usare il valore misurato in Step 0 (placeholder `vector(3584)` se confermato).

```sql
create table agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  biography_id uuid references biographies(id) on delete cascade,
  agent_type text not null check (agent_type in ('platform_guide','biography_coach','publication_reviewer')),
  locale char(2) not null default 'en',
  status text not null default 'active' check (status in ('active','archived')),
  rolling_summary text default '',
  message_count int not null default 0,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);
-- PostgreSQL: NULL in unique index non deduplica — indici parziali separati
create unique index agent_threads_platform_guide_active
  on agent_threads (user_id, agent_type)
  where status = 'active' and biography_id is null;
create unique index agent_threads_bio_active
  on agent_threads (user_id, biography_id, agent_type)
  where status = 'active' and biography_id is not null;

create table agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references agent_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null default '',
  tool_calls jsonb,
  created_at timestamptz default now()
);
create index on agent_messages (thread_id, created_at);

create table agent_memory_facts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references agent_threads(id) on delete cascade,
  fact_type text not null,
  fact_json jsonb not null,
  created_at timestamptz default now()
);

create table biography_chunks (
  id uuid primary key default gen_random_uuid(),
  biography_id uuid not null references biographies(id) on delete cascade,
  section_key text,
  chunk_index int not null,
  content text not null,
  text_hash text not null,
  embedding vector(3584),  -- adeguare alle dimensioni Step 0
  created_at timestamptz default now()
);
create index on biography_chunks (biography_id);
create unique index on biography_chunks (biography_id, section_key, chunk_index);

-- RAG onboarding (Step 7): KB prodotto, senza biography_id
create table kb_chunks (
  id uuid primary key default gen_random_uuid(),
  locale char(2) not null default 'en',
  source_key text not null,
  chunk_index int not null,
  content text not null,
  text_hash text not null,
  embedding vector(3584),
  created_at timestamptz default now()
);
create unique index on kb_chunks (locale, source_key, chunk_index);
create index on kb_chunks (locale);

-- Quota agenti (distinta da ai_usage_tracking toolbar)
create table agent_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  turn_count int not null default 0,
  primary key (user_id, usage_date)
);
```

RLS: deny all per `anon`/`authenticated` su tabelle agenti; accesso solo via `service_role` nel gateway dopo verifica ownership in codice.

Criterio di accettazione: insert/read di prova su `biography_chunks`, `kb_chunks`, `agent_usage`.

---

## Step 3: agent gateway, route in streaming + rate limit

Obiettivo: endpoint chat con auth esistente, tool loop, quota agenti.

Route sotto `app/api/agents/`:

- `POST .../chat/stream/route.ts` — principale SSE
- `POST .../chat/route.ts` — fallback non-stream
- `GET .../threads/[id]/messages/route.ts` — cronologia paginata
- `DELETE .../threads/[id]/route.ts` — GDPR / admin

Auth: stesso pattern di `draft-ai-review` + `admin-api-auth`.

**Rate limit agenti:** prima di ogni turno, incrementare/controllare `agent_usage` (giornaliero + burst in-memory o tabella `agent_burst` opzionale); rispondere 429 con messaggio i18n. Non consumare quota `ai_usage_tracking` esistente (toolbar grammar/rewrite resta separata). Nota: burst in-memory e OK con istanza singola Jelastic in beta; con piu istanze Next.js servira tabella `agent_burst` o Redis condiviso.

**Get-or-create thread:** il gateway non fa `INSERT` cieco su `agent_threads`. Per ogni richiesta: cercare thread `active` esistente (per `platform_guide`: `user_id` + `agent_type` + `biography_id IS NULL`; per coach/reviewer: `user_id` + `biography_id` + `agent_type`), riusarlo o crearne uno nuovo. Gli indici parziali dello Step 2 garantiscono un solo thread attivo per combinazione.

**Onboarding minimo (smoke E2E):** in Step 3 abilitare solo `platform_guide` con system prompt minimale (senza RAG) per validare streaming + persistenza messaggi prima del coach.

Tool loop: prima passata non-stream con `tool_choice: auto`; se tool_calls, eseguire e seconda passata stream; altrimenti stream diretto.

Criterio di accettazione: thread creato, messaggi salvati, streaming OK, 429 oltre soglia, cross-user forbidden.

---

## Step 4: componente AgentChat

Obiettivo: UI conversazionale stile Gemini, riusabile.

`components/agents/AgentChat.tsx`: bolle, markdown, scroll, input, streaming via `fetch` + reader.

**Sync editor dopo `propose_draft`:** il gateway, al termine del tool `propose_draft`, emette nell'SSE un evento strutturato prima della chiusura stream, es. `event: tool_result` con `{ tool: 'propose_draft', sectionKey, contentLength }`. `AgentChat` espone callback `onDraftApplied(sectionKey)`. In `app/biography/[id]/edit/page.tsx`, il callback esegue **refetch** della biografia da Supabase (`select content`) e aggiorna `setContent` — stesso effetto di `markDirty` senza richiedere reload pagina. Alternativa accettabile: `router.refresh()` se il refetch e troppo invasivo in beta.

Criterio di accettazione: dopo bozza proposta dal coach, il testo compare nell'editor attivo entro pochi secondi senza reload manuale.

---

## Step 5: coach, agente prioritario

Obiettivo: chat scrittura biografia con memoria fino a `published`.

Modello: `google/gemma-4-31B-it`. Thread unico `biography_coach` per biografia.

**Scope beta:** gateway rifiuta coach se `biography_mode !== 'sections'` con messaggio localizzato che spiega di usare la modalita a sezioni. Tool `read_section` / `propose_draft` operano solo su `biographies.content[sectionKey]` (non freeflow).

Quattro strumenti (mapping invariato):

- `get_progress` — `getCompletedSections`
- `read_section` — `biographies.content[sectionKey].text` + stato sezione
- `propose_draft` — append server-side + evento SSE `tool_result` (Step 4); max 1500 parole; **solo su richiesta esplicita utente**
- `complete_section` — `markSectionComplete`

Prompt: `lib/agents/prompts/coach.ts`.

Sostituzione `conversation-mode`: coach principale; legacy dietro flag fino a validazione.

Criterio di accettazione: saluto al ritorno, bozza in editor, avanzamento sezioni, conversazione persistente al reload.

---

## Step 6: RAG biografia

`indexBiography(biographyId)` — chunk 500–1000 token, embed, upsert `biography_chunks` con `text_hash`.

`retrieve(biographyId, query, k)` — cosine su `biography_chunks` (scan table OK in beta).

Trigger: completamento sezione o apertura coach se chunks assenti/stale.

---

## Step 6b: purge memoria a `published`

Obiettivo: cancellare dati agente quando la biografia viene pubblicata (decisione confermata).

Creare `lib/agents/purge-agent-memory.ts`:

```typescript
async function purgeAgentMemoryForBiography(serviceClient, biographyId: string): Promise<void>
```

Operazioni (ordine):

1. Trovare thread `biography_coach` e `publication_reviewer` per `biography_id`.
2. `DELETE` da `agent_messages` (cascade da thread) o delete thread.
3. `DELETE` da `agent_memory_facts`.
4. `DELETE` da `agent_threads` (status `archived` opzionale audit 24h poi delete — in beta delete diretto).
5. `DELETE` da `biography_chunks` per quella biografia.

**Hook:** chiamare `purgeAgentMemoryForBiography` in `runReviewSubmitScreening` (o subito dopo update `status = 'published'`) in `lib/server/review-submit-pipeline.ts`. Path admin che bypassano il pipeline: `components/admin/ModerationDetailPanel.tsx` e `components/admin/BiographyDetailPanel.tsx` — invocare purge subito dopo l'update `status = 'published'`. Alternativa centralizzata: helper `setBiographyPublished(serviceClient, biographyId)` usato da tutti i path. Idempotente: seconda chiamata no-op.

Non cancellare: contenuto biografia, PDF, `draft_ai_feedback` storico (opzionale: anonimizzare).

Criterio di accettazione: dopo publish, `agent_threads` e `biography_chunks` vuoti per quella biografia; coach non puo riprendere conversazione precedente.

---

## Step 7: onboarding completo

Modello: Nemotron. Thread `platform_guide` senza `biography_id`.

Popolare `kb_chunks` da `lib/help/help-kb.ts` tradotto IT/EN/FR/DE (script seed o migrazione dati). RAG come Step 6 su `kb_chunks`.

Sostituire `HelpChatbot.tsx` con `AgentChat` + `platform_guide`.

Criterio di accettazione: domanda prodotto in streaming, lingua utente, citazioni KB pertinenti.

---

## Step 8: reviewer pubblicazione

Modello: Gemma. Thread `publication_reviewer` separato.

Convergenza incrementale con `review-submit-pipeline.ts`; verdetto strutturato via function calling per `moderation_reports` / `ai_screening_status`.

Mantenere route legacy funzionanti fino a cutover.

Criterio di accettazione: verdetto coerente con screening attuale; casi puliti auto-publish.

---

## Step 9: rilettura Apertus (opzionale)

Route `POST /api/agents/apertus-review` non agentica, no tools, no stream. Pulsante editor "rilettura con modello svizzero".

---

## Coesistenza conversation-mode e checkpoint

Migrazione checkpoint → thread coach alla prima apertura (`loadCheckpoint` → seed `agent_messages`, poi `deleteCheckpointByBioSection`). Flag per tenere legacy come ripiego.

## Cosa NON fare in Fase 1

Niente migrazione da Supabase, niente PostgreSQL autogestito, niente Kubernetes, niente sostituzione auth, niente self-hosting GPU, niente partizionamento messaggi. Coach su **freeflow** rimandato a post-beta.

## Ordine di esecuzione

| Ordine | Step | Note |
| --- | --- | --- |
| 1 | **0** | Spike models + embed + swap + fix smart-followup |
| 2 | **1–2** | Client + schema (incl. `kb_chunks`, `agent_usage`) |
| 3 | **3–4** | Gateway + AgentChat; **onboarding minimo** in 3 per smoke streaming |
| 4 | **5–6** | Coach + RAG biografia |
| 5 | **6b** | Purge on published (subito dopo coach funzionante) |
| 6 | **7** | Onboarding completo + kb_chunks |
| 7 | **8–9** | Reviewer + Apertus opzionale |

Rischio principale: latenza streaming Infomaniak e quota ~300 req/min — misurare in Step 3; `agent_usage` protegge da abuso lato app.

## File principali

**Nuovi:** `lib/agents/models.ts`, `lib/agents/infomaniak-client.ts`, `lib/agents/purge-agent-memory.ts`, `lib/agents/prompts/*`, `lib/agents/tools/*`, `app/api/agents/**`, `components/agents/AgentChat.tsx`, migrazione `supabase/migrations/*_agent_tables.sql`

**Modificati:** `lib/ai/smart-followup.ts`, `lib/server/review-submit-pipeline.ts`, `app/biography/[id]/edit/page.tsx`, `components/help/HelpChatbot.tsx`, `components/editor/conversation-mode.tsx` (deprecazione), `components/admin/ModerationDetailPanel.tsx`, `components/admin/BiographyDetailPanel.tsx` (purge on publish)

**Invariati in Fase 1:** auth Supabase, storage Supabase, edge functions (fino a eventuale migrazione chiamate agenti su route Next)
