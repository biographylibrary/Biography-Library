# Biography Library — Architecture

A reference for developers onboarding to the codebase. Covers routing, data layer, editor, AI pipeline, review workflow, and PDF generation.

---

## 1. Repository Layout

```
app/                        Next.js App Router pages
  biography/[id]/edit/      Main editor (server shell + heavy client subtree)
  biography/[id]/view/      Public/shared reader
  admin/                    Moderation, review, users, AI stats
  api/review/submit/        API route — AI screening entry point
  autobiography/            Declaration wizard (autobiography path)
  deceased-biography/       Declaration wizard (third-party path)
components/
  editor/                   All editor UI (sidebar, AI panels, export dialogs)
  admin/                    Moderation table, detail panels, badges
  dashboard/                Dashboard cards
  ui/                       shadcn/ui primitives (untouched)
lib/
  ai/                       AI client, provider facade, narrative services
  i18n/                     Translation strings + context (en, it, fr, de)
  moderation/               Moderation action helpers and types
  supabase.ts               Singleton Supabase client
  auth-context.tsx          Auth provider + useAuth hook
  pdf-export.ts             jsPDF B5 document builder
  checkpoint-service.ts     Conversation state persistence
  section-status-service    Draft version state machine
  section-completion-service Mark sections done/undone
  biographies.ts            Biography CRUD helpers
supabase/
  functions/                Edge Functions (Deno)
  migrations/               Ordered SQL migrations
```

---

## 2. Next.js App Structure & Routing

The project uses **Next.js 13 App Router**. Pages are React Server Components by default; client interactivity is isolated to leaf components with `"use client"`.

### Key routes

| Route | Notes |
|---|---|
| `/` | Marketing / landing |
| `/dashboard` | User's biography list |
| `/biography/[id]/edit` | Full editor — server shell hands off to client component tree |
| `/biography/[id]/view` | Public reader; validates share token for link-only biographies |
| `/admin/review` | Human moderation queue (reviewer role+) |
| `/admin/moderation` | Report management |
| `/admin/users` | User management (admin role+) |
| `/admin/ai-stats` | AI usage dashboard |
| `/api/review/submit` | POST endpoint — starts AI screening pipeline |
| `/auth/callback` | Supabase OAuth callback handler |

### Page data loading

Most pages are statically rendered shells that fetch data client-side via Supabase JS. The editor (`/biography/[id]/edit`) is the heaviest page — it renders a client component tree that owns all state. `"use client"` is only added where hooks or browser APIs are required.

---

## 3. Supabase: Auth, RLS, and Main Tables

### Client setup (`lib/supabase.ts`)

A singleton `createClient()` is shared across the entire app. The anon key is the only key exposed to the browser. The service role key is used exclusively inside Edge Functions and the `/api/review/submit` route.

### Authentication (`lib/auth-context.tsx`)

`AuthProvider` wraps the entire app and exposes `useAuth()`. On mount it calls `onAuthStateChange` and loads the user's profile row (role, font size preference). Sessions are persisted in localStorage and auto-refreshed. The AI client proactively refreshes tokens 300 seconds before expiry to avoid mid-request 401s.

Roles stored in `profiles.role`: `user` → `reviewer` → `admin` → `super_admin`. Role escalation is logged in `role_change_log`.

### Core tables

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users`; stores role, ui_font_size, ai_features preference |
| `biographies` | One row per edition. Originals have `translation_of` null; a translation points at its original (no chains). Text language is `record_language_tag` (BCP 47). `content_language` è stata eliminata da `20261009150000`. On editions only, `original_version_at` holds the original's version timestamp (`COALESCE(revised_at, published_at)`) at last alignment; server-owned, not exposed by `biography_flat` (still 78 columns). |
| `biography_sections` | One row per (biography, section_key). Stores content, draft version, status, revision history array |
| `biography_book_structure` | Front/back matter (dedication, epigraph, preface, epilogue, acknowledgements, specific_credits as JSONB) |
| `biography_media` | Photos of the original: file_url, layout, display_order, caption. Editions do not copy the files. |
| `conversation_checkpoints` | AI conversation state per (user, biography, section): conversation_log, answers, questions_completed |
| `section_completions` | Lightweight completion flags per (biography, section_key) |
| `biography_edition_captions` | Caption of an edition for a photo that stays on the original (`biography_id` + `media_id`). Public read only when that edition and its original are both published and public. |
| `moderation_reports` | Content review records: reporter_id, report_type, ai_analysis JSONB, flagged passages, status, decision |
| `ai_rate_limits` | Per-user request tracking for daily/weekly quota enforcement |
| `user_notifications` | In-app alerts sent to users after moderation decisions |
| `admin_action_log` | Audit trail for all admin actions |
| `error_logs` | Client-side errors sent via the `log-error` Edge Function |

### Photos: upload, processing, storage (changed 2026-10-06)

The browser no longer writes to the `biography-photos` bucket. `POST /api/biography/[id]/media` (Node runtime, `app/api/biography/[id]/media/route.ts`) is the only writer:

1. **Who**: the biography owner, active account, biography not frozen, status in the author-writable list (`canAuthorWriteText`; the service role bypasses the `a01_*` triggers, so the route checks it in code). Gallery limit 15 (`lib/biography-media-constants.ts`, also enforced by a database trigger).
2. **What**: the type is read from the first bytes (JPEG, PNG, WebP; HEIC and GIF are refused, because the prebuilt libheif in `sharp` decodes AVIF only), 20 MB in, 150 megapixels at most.
3. **Processing** (`lib/server/photo-processing.ts`, `sharp`): EXIF orientation applied to the pixels, sRGB, every metadata block dropped (EXIF, XMP, IPTC, GPS, ICC), transparency flattened on white, long side at most 2560 px (gallery) or 3100 px (`cover`, `cover_a5`) and never enlarged, mozjpeg quality 85 progressive. The processed JPEG replaces the original; the original is not kept.
4. **Write**: service role, path `{user_id}/{biography_id}/{timestamp}-{random}.jpg`, then the `biography_media` row with dimensions and byte counts. Covers: the previous cover files are removed only after the new upload succeeded.

Storage policies (`storage.objects`, bucket `biography-photos`): after migration `20261006120000` the browser can read and delete its own folder (`(storage.foldername(name))[1] = auth.uid()::text`) but not write, and the bucket carries a per-file limit of 20 MiB (the same number as the route's `MAX_UPLOAD_BYTES` and the editor's `PHOTO_UPLOAD_MAX_BYTES`; `lib/__tests__/photo-size-limit-consistency.test.ts` keeps the three equal, and the limit only applies to new files). The bucket is private; the PDF generator and the editor read through signed URLs.

**Operational constraint**: Next 13.5 standalone output does not include the native `sharp` binary (`@img/sharp-<platform>` is loaded by a dynamic `require`; `outputFileTracingIncludes` does not apply to App Router route handlers in this version). The `Dockerfile` copies `node_modules/@img` into the runtime image; `.github/workflows/docker-image.yml` builds the image and proves `sharp` loads inside it.

**Existing photos**: `scripts/recompress-photos.ts` (`npm run photos:recompress`, simulation by default, `--apply` to write; logic in `lib/server/photo-recompression.ts`). Order per photo: new file at a new path, read it back and check it, update the row and check where it points, only then delete the old file (and only if no other row, such as the paired `cover`/`cover_a5`, still uses it). Never touches the `archive` bucket.

### RLS pattern

Every table has RLS enabled. The general policy pattern is:

- **SELECT**: `auth.uid() = user_id` (owner reads own data)
- **INSERT/UPDATE**: same ownership check + role checks for admin tables
- **Public biographies**: an additional policy allows anonymous reads where `visibility = 'public'`
- **Share-token access**: `get_biography_by_share_token()` security-definer RPC bypasses RLS for link-only biographies without leaking other rows
- **Frozen biographies**: a `RESTRICTIVE` policy blocks any UPDATE when `is_frozen = true`, regardless of other policies

---

## 4. Editor Modes: Sections vs Freeflow

The `biography_mode` column on `biographies` determines the editing experience, set at creation and never changed.

### Section mode (default)

Nine predefined section keys: `childhood`, `family`, `education`, `career`, `life_events`, `relationships`, `challenges`, `passions`, `legacy`.

Each section has its own row in `biography_sections` with an independent status machine:

```
in_progress → draft_1 → draft_2 → draft_3 → approved → locked
```

Draft increments happen when the user saves a revised version. `section_status-service.ts` owns these transitions.

The editor UI renders a `SectionSidebar` for navigation and a `SectionEditor` (Tiptap rich text) for the active section. **As of the Markdown block (6 October 2026):** TipTap 3.19 loads/saves via `@tiptap/markdown` plus the archive serializer in `lib/archive-markdown.ts` (NFC, character escapes, scene separator `***`). Stored original is CommonMark Markdown; HTML is render-only (`storedToSafeHtml`, `html: false`). Paste/import share `lib/editor-content-clean.ts`. The public view reads `content` **and** `content_freeflow` / `biography_mode`.

### Freeflow mode

A single continuous rich-text field (`content_freeflow` on the `biographies` row). No section sidebar, no per-section status tracking. Suitable for users who want to write without structure. The same Tiptap editor is used; Echo and the grammar check work on the whole text.

### Book structure (both modes)

`biography_book_structure` holds optional front and back matter (dedication, epigraph, preface, epilogue, acknowledgements, specific_credits), each with content and an `*_enabled` toggle. `BookStructurePanel` edits it; RLS stays owner-only. Readers get selected parts via `GET /api/biography/[id]/book-parts` after `verifyBiographyViewAccess` (public path uses `biography_public_read_allowed`). Pure selection and titles live in `lib/book-parts.ts`. The six parts appear in the PDF, screening/fingerprint, reading page, archive `biography.md`, and permanence TXT/DOCX; the optional author copyright page stays PDF-only. Edition archive packages (sub-step D) should pass that edition’s rows into the same `buildBiographyMarkdown`.

---

## 5. AI Pipeline

*Updated 8 October 2026 (block 3, chunked screening + preprint check).*

AI works on an author's text in four cases only: **Echo** (suggests structure and edits inside the text, and also answers platform questions using the knowledge base), the **grammar check** on request, the **final check before print** (`runPreprintCheck`, on demand), and the **compliance screening** before publication (`runPublicationScreening`, chunked over the whole text; moderation, not an author tool). Everything else was removed: reader-side automatic translation, guided prompts, summaries, rewriting, section review with AI, Apertus review, follow-up questions, structure proposals, the biography coach and publication reviewer agents, and per-draft AI review on watermarked PDF downloads.

### One client, one ledger

Every call to a model goes through **`lib/agents/infomaniak-client.ts`** (chat, streaming, embeddings; Infomaniak AI Services, OpenAI-compatible, Switzerland). Each call, including failed attempts and fallback-model attempts, writes one row to **`ai_token_usage`** via `lib/ai/usage-recorder.ts` (service role only): user, biography, purpose (`echo`, `grammar`, `preprint_check`, `screening`, `embedding`, `memory_compression`, `transcription`, `tts`), model, `prompt_tokens`, `completion_tokens`, `total_tokens`, an `estimated` flag and the outcome. `usage` is read from the provider response; for streams the client asks for it with `stream_options.include_usage` and, if the provider omits or rejects it, estimates characters / 4 and marks the row as estimated. A `usage` context is a required option of `chat`, `chatStream` and `embed`, so an unrecorded call does not compile.

Two documented exceptions: **transcription** (Whisper) still runs in the Deno Edge Function `audio-transcription` and writes its own row (provider seconds, when returned); **text-to-speech** runs on Mistral Voxtral, not Infomaniak, and records the characters sent.

**Tool calls written as text.** Gemma 4 sometimes writes a call to a tool as a line of text in its reply (`propose_draft(sectionKey="freeflow", draftText="...")`) instead of using the `tool_calls` field of the response; seen on 5 October 2026 in the first test with a real account, where the author read the raw line and got no Insert card. `lib/agents/text-tool-calls.ts` recognises it and `runStreamingAgentTurn` runs it as a real call. It only accepts tools actually offered to the model, only on a line of its own, and only with exact arguments (`key="text"`, `true`, numbers, or one JSON object); a tool name quoted inside a sentence is left alone. The request sent to the provider is the same as before block 1, so this is model behaviour, not a regression.

**Replace proposals are checked before the card appears.** When Echo proposes to replace a passage (`propose_draft` with `replaceText`), `replacePassageExists` (`lib/echo/apply-draft.ts`) looks for the passage in the saved text with the same rule the apply step uses. If it is not there, no card is shown: the model gets an error telling it to read the document again and retry with a short, exact, continuous passage. Seen on 5 October 2026: asked to delete one sentence, the model sent a 918-character `replaceText` made of the start of one paragraph joined to the end of another, the card appeared, and the Replace button answered "I couldn't find that passage". Words are deleted by replacing a short passage with the same passage without them (an empty `draftText` is not accepted).

The search for the passage (`placeDraftInDocument`, used by both the check and the apply step, so a card never promises what Replace cannot do) tries, in order: the exact text; the same words with any run of spaces or line breaks; and a tolerant match that ignores curly vs straight apostrophes and quotes, dash variants, non-breaking spaces and markdown marks (`replaceTolerant`). The tolerant match needs at least 8 characters, takes the first occurrence, and is refused when it would cut a bold, italic or code pair in half. The card shows the passage being replaced ("Instead of:", clipped to its start and end) above the new text, and the applied words stay highlighted in bold on a light background for 10 seconds (all paragraphs of a multi-paragraph text, not only the first).

If a proposal failed and none succeeded afterwards in the same turn, the app itself appends a plain notice that the text has not been changed (`draftNotApplied` in `lib/agents/run-agent-turn.ts`, four languages). The model's own wording is left as written, because it often narrates a change as done when the tool answered with an error; the last word is the app's.

Models are chosen with `AGENT_MODEL_*` (see `lib/agents/models.ts`); the grammar chain uses `INFOMANIAK_AI_MODEL_GRAMMAR`, then `_PRIMARY`, then `_FALLBACK`. Credentials are never in the client bundle.

### Author translations (editions)

- `POST /api/biography/create-edition` — owner only; body `{ originalId, languageTag, startFrom: 'copy' | 'blank' }`. Creates a draft row with `translation_of`, no UM id, no pioneer flag, no chapter cooldown / provisional window. Text and structure are written in the same INSERT (`copy` or `blank`); there is no mid-copy step to roll back. Concurrent same-language inserts map unique-index violations to `409 language_already_present`. Visibility and license (`visibility`, `rights_*`) are copied from the original and kept in sync by a database trigger; authors cannot diverge them on an edition row.
- `POST /api/biography/edition-aligned` — owner only on a row with `translation_of`; sets `original_version_at` to the current `COALESCE(revised_at, published_at)` of the original.
- Submit paths (`approve-final-pdf`, `approve-text`, `review/submit`) refuse an edition whose plain text still matches the original (`409 translation_identical_to_original`) and still require the original to be `published`.
- AI writing tools never run on an edition (`translation_of` set): grammar answers `403 grammar_not_available_for_edition`; Echo (threads/active, chat/stream via `prepareAgentTurn`, apply-draft) answers `403 echo_not_available_for_edition`. Publication screening still applies to editions.

### Grammar check (`POST /api/biography/[id]/grammar`, Node runtime)

```
Browser (lib/grammar-service.ts, fetchWithAgentAuth)
  → auth (Bearer JWT) → load profile + biography (service role)
  → same rule as the RLS UPDATE policy on biographies:
      owner + active account + not frozen, or staff
  → if translation_of is set → 403 grammar_not_available_for_edition
      (all roles, including staff; before language check, usage, or model call)
  → text in the body (authors check unsaved text); > 30,000 characters after stripping
      HTML → 413 with a message in four languages (no silent truncation)
  → per-minute limit (ai_rate_limits), token cap, daily/weekly counters (ai_usage_tracking)
  → chat() with models [Apertus 1.5, Gemma, Mistral], temperature 0.7, 2048 tokens,
      45 s, 3 attempts per model on 429/503/504
  → JSON array of suggestions, identical-pair suggestions dropped
```

Limits kept from the old Edge Function, unchanged: 5 per minute, 40 per UTC day, 200 per UTC week per user (staff exempt), same environment variable names.

### Token caps

`ai_author_token_limits` holds three nullable values (day, week, month; `null` = off). Usage is summed from `ai_token_usage` over **calendar periods in Europe/Zurich** by `ai_author_token_usage()` (week starts Monday). Only `echo` and `grammar` count; `screening`, `preprint_check`, `embedding` and `memory_compression` never do, so an author who exhausted the cap can still publish. Over the cap, Echo and grammar answer 429 with `error: token_cap_exceeded`, a message in the author's language and the time the period reopens. Staff are exempt but recorded. The check fails open if the ledger cannot be read.

### Audio transcription

`VoiceRecorder` captures audio in the browser, sends the blob to the `audio-transcription` Edge Function with the user's JWT, and receives a transcript string that is inserted at the cursor position in the editor.

---

## 6. Review, Moderation & Publication Flow

### States on `biographies.status`

```
draft → submitted → ai_screening → pending_review → published
                                                   ↘ returned (back to draft)
                                                   ↘ removed
```

`ai_screening_status` is a parallel field: `pending` → `passed` / `flagged` / `ai_error`.

### Step 1 — User submits (`POST /api/review/submit`)

1. Throttle check: max 3 submissions per 60 seconds per user.
2. Biography and all section content is fetched (service role).
3. AI screening prompt is built containing all text.
4. Infomaniak AI returns flagged passages: `{text, section_key, reason, severity (1–3)}`.
5. **No flags** → biography status set to `published`, notification sent to user.
6. **Flags found** → `moderation_reports` row created with AI analysis JSONB; biography set to `pending_review`; assigned to the reviewer with the fewest open reports (load balancing).
7. **AI error** → manual review path; report created with `ai_screening_status = 'ai_error'`.
8. **Fallen / interrupted / unstartable screening job** (block 3c) → same manual review path via `routeScreeningFailureToManualReview` (atomic claim on `pending`); cron `POST /api/cron/analysis-jobs` runs the stale sweep without requiring the editor. Revision-correction jobs (`reportId` in context) and `preprint_check` do not open new reports.
9. **Writings the PDF engine does not cover** (Latn, Cyrl, Grek only) go from `final_version` to `locked_pending_screening` through `POST /api/publication/approve-text`. The author confirms the text online; the confirmation is stored in `final_pdf_approved_at`. No `pdf_draft`, no `final_pdf_url`. An edition is published only when its original is already `published`; otherwise the screening result is `held_for_original` and the row stays locked.

### Step 2 — Human review (`/admin/review`)

Reviewers see a queue of assigned reports. The `ModerationDetailPanel` shows the biography content alongside the AI-flagged passages. Available decisions:

| Decision | Effect |
|---|---|
| `publish` | Biography published, user notified |
| `publish_warning` | Published with a warning note to the author |
| `returned` | Status back to `draft`; author receives feedback |
| `request_edit` | Author must revise specific sections |
| `removed` | Biography removed from platform |
| `no_action` | Report closed without change |
| `hide` | Biography hidden pending further review |

All decisions are written to `admin_action_log`. The user receives a `user_notifications` row with the decision and any moderator note.

### Re-submission

On re-submission after `returned`, the AI screens the **whole text** again (since 30 September 2026 there are no targeted re-screenings: a guarantee about the published text cannot rest on part of it). The old report is closed by the new screening.

### Frozen biographies

Admins can freeze a biography (`is_frozen = true`). A `RESTRICTIVE` RLS policy blocks all UPDATE operations on a frozen biography regardless of other policies. This is used when a moderation hold requires no further edits.

### 6a. Target publication flow (approved product spec)

This subsection records **agreed behaviour** for the PDF-first workflow and legacy submit. Legacy §6 behaviour still applies where not superseded below.

**States on `biographies.status` (target schema — see migration `20260403140000_publication_flow_phase_statuses.sql`)**

| Status | Role |
|--------|------|
| `draft` | Work in progress |
| `sections_complete` | All sections marked complete |
| `final_version` | Author in final prose pass (pre–PDF workflow) |
| `pdf_draft` | Watermarked PDF draft rounds; `pdf_draft_iteration` 1–`PDF_DRAFT_MAX_ITERATION` (30); optional `pdf_draft_started_at` |
| `locked_pending_screening` | Final PDF approved; text locked; collateral generated; AI screening next; optional `final_pdf_approved_at` |
| `under_review` | Human reviewer queue (after AI flags / errors), or legacy path |
| `published` | Live per visibility |
| `removed` | Moderation take-down |
| `suspended_pending_verification` | Suspended pending verification (staff) |
| `revision_requested` | A reviewer asked the author to correct specific passages (30 days) |
| `revision_pending_review` | The author sent the correction; waiting for the reviewer |
| `revision_overdue` | The 30 days passed without a correction; only an appeal or staff can move it |

Helpers: `lib/publication-state.ts` (`AUTHOR_TEXT_WRITABLE_STATUSES`, `canAuthorWriteText`, `isAuthorTextEditableStatus`, `isReviewOrScreeningLockStatus`, etc.).

**Where the author may write text (closed list).** Text is writable only in `draft`, `sections_complete`, `final_version`, `pdf_draft` (correction rounds after the pre-print check) and `revision_requested`. In every other state, including `under_review` and `locked_pending_screening`, text is locked. The rule lives in two places that a test keeps equal: the SQL function `author_text_writable_statuses()` (triggers `a01_*` on `biographies` and on `biography_sections`, `biography_book_structure`, `person_events`, `person_relations`, `biography_media`, which follow the parent biography's status; migration `20260930120150_author_text_whitelist.sql`) and the TypeScript constant `AUTHOR_TEXT_WRITABLE_STATUSES`. The triggers stop sessions running as `authenticated` or `anon`; server routes that write text with the service role (Echo `apply-draft`, `convert-mode`) check the status in code. A new status is locked until it is added deliberately to both lists.

**API (phase 2 — implemented)**

| Route | Purpose |
|-------|---------|
| `POST /api/publication/start-pdf-draft` | `final_version` → `pdf_draft`; sets `pdf_draft_started_at`, clears `pdf_draft_iteration` and `draft_ai_feedback` |
| `POST /api/publication/record-pdf-draft` | After each watermarked draft download: increments `pdf_draft_iteration` only (no model call). `draft-ai-review` remains as a deprecated alias. |
| `POST /api/publication/preprint-check` | Starts a background quality check (`analysis_jobs`, kind `preprint_check`); responds **202** with `jobId`. On success writes `draft_ai_feedback` and `preprint_check_runs`. Does not block approval. |
| `GET /api/analysis-jobs` | Owner or staff: latest job status/outcome for `biographyId` + `kind` (also interrupts stale `running` jobs). |
| `POST /api/cron/analysis-jobs` | Cron (`CRON_SECRET`): `sweepStaleAnalysisJobs` — interrupt all stale `running` jobs; publication screening → human queue via `routeScreeningFailureToManualReview`. |
| `POST /api/publication/approve-final-pdf` | Requires `pdf_draft` + at least one draft iteration; locks → `locked_pending_screening`; `await` TXT/DOCX export; starts screening job (**202**). Preprint suggestions never force `under_review`. |
| `POST /api/review/submit` | Sync status → `under_review` + pending; starts screening job; **202** `{ jobId }` |

Watermarked PDF downloads are blocked while `status === 'final_version'` until the author starts the PDF phase (export dialog shows `draftPhaseRequiredBeforeDraft`). Draft downloads call `record-pdf-draft`. The author may run `preprint-check` once finished; it is advisory only.

**Cover assets (v1)**

- **`cover_a5`** layout on `biography_media` — full-bleed A5 cover for print PDF (`PhotoGalleryPanel`, migration `20260508120000_...`). `start-pdf-draft` and `approve-final-pdf` accept `cover` or `cover_a5`.
- **`include_author_copyright_page`** on `biography_book_structure` — optional author/copyright sheet at book start (`BookStructurePanel`, `lib/pdf-export.ts`). See [`docs/DESIGN.md`](docs/DESIGN.md) for layout tokens.

**Final PDF + catalogue cover (phase 3)**

- On **approve final PDF** (`POST /api/publication/approve-final-pdf`), before locking for screening, the server generates the **full book PDF** (no watermark) via `generateBiographyPDF(…, returnArrayBuffer: true)` with the service-role Supabase client (`lib/server/final-pdf-artifacts.ts`, `setPdfExportSupabaseClient`). Fonts load from `public/fonts/noto-serif` on the server filesystem.
- The file is uploaded to **`biography-exports/{biography_id}/final.pdf`** and **`final_pdf_url`** is stored on `biographies`.
- **`listing_cover_url`** is a **JPEG raster of PDF page 1** produced server-side with **`pdfjs-dist`** + **`@napi-rs/canvas`** (`lib/server/render-pdf-first-page-jpeg.ts`), uploaded as `biography-exports/{id}/listing-cover.jpg`. The public catalogue and the **reader view** prefer it when set; otherwise they fall back to the **`biography_media` cover photo** (`app/biographies/page.tsx`, `app/biography/[id]/view/page.tsx`). Link-only share links receive `listing_cover_url` via **`get_biography_by_share_token`** (migration `20260403210000_share_token_rpc_listing_cover.sql`).
- Legacy **Submit for review** from **`draft`** or **`sections_complete`** (without final-version / PDF flow) remains available; the editor shows **`publicationLegacySubmitHint`** nudging authors toward Final Review → PDF path.

**1. PDF draft rounds (replaces current submit)**

- The author downloads a **full PDF** with draft watermark on **every** page (`pdf_draft_iteration` up to `PDF_DRAFT_MAX_ITERATION` = 30). Labels are dedicated for rounds 1–3; from round 4 onward the watermark is a generic “DRAFT N” / “BOZZA N” with the number.
- Draft rounds are for the author’s own review (Echo and grammar remain available while writing). The optional **final check before print** is a separate action.
- **If OK:** generate the **final** PDF (no watermark), **lock text** definitively, and generate **.txt** and **.docx** collateral per existing export rules.
- **“CSS rules” for cover / back cover** means the **layout rules already encoded in the PDF pipeline** (measurements, colours, fonts in `lib/pdf-export.ts` / jsPDF — not a separate HTML/CSS export). Implementation must be verified against this spec.
- **Cover image assets for listings** (grid, biography page) are **rasterised from the first page of the approved final PDF** (e.g. JPG/WebP derivatives at defined sizes). The public biography page layout will be redesigned to show this asset at a **medium** size (not huge, not tiny).

**2. After PDF approval (order of operations)**

1. Content is locked; collateral files generated as above.
2. **AI screening** runs on the content.
3. **If AI finds no flags:** **publish** according to visibility (cover raster is already generated at approve-final); the biography appears in the public catalogue / search when visibility is public.
4. **If AI finds flags:** the biography does **not** auto-publish. It goes to `under_review` with an open `moderation_reports` row, and the **text stays locked** (closed list above). A reviewer decides: publish, or ask the author to correct specific passages (`revision_requested`, 30 days, then `revision_pending_review`). The in-place correction of flagged sections inside `under_review` and its "resubmit for screening" button were removed on 30 September 2026. What the author can still do from `under_review` is **"Riprova analisi"** after an AI error (`ai_screening_status` = `ai_error` or `parse_error`): it re-runs the screening on the same, unchanged text (`POST /api/review/submit` accepts that retry only from `under_review` or `locked_pending_screening` with those two values).

**3. Human reviewer vs auto-publish**

- If the **AI approves** (nothing to flag): **automatic publication** (no human reviewer queue for that path).
- If the **AI does not approve** (flags): enter the **existing reviewer flow** — reviewer sees **only problematic excerpts**, not the full book; author is notified; author corrects **flagged sections**; re-review; approval or rejection as today.

---

### 6b. Publication fingerprint gate

Guarantee: **the text that goes online is exactly the text the screening examined.** Implemented in `lib/server/publication-fingerprint.ts`, table `publication_records` (service role only; migration `20260930115700_publication_records.sql`).

- **Fingerprint**: SHA-256 of a canonical JSON of everything the public can read: title and names, `content`, free-flow text, `final_version`, `biography_sections`, the enabled parts of the book structure, photo captions, `person_events`, `person_relations`. Text is normalised to archive Markdown and NFC. `content` and `final_version` remain two fields (both enter the fingerprint). Author-text columns are listed once in SQL `biographies_author_text_columns()`, in `BIOGRAPHIES_AUTHOR_TEXT_COLUMNS`, and in the fingerprint select — kept equal by `lib/__tests__/author-text-columns-sync.test.ts`.
- **Screening text (block 3d)**: `fetchScreeningPublicText` / `assembleScreeningText` (`lib/server/screening-public-text.ts`) builds the model input from the same public surface as the fingerprint, with `[SECTION: …]` markers (body; if normalised `final_version` differs from the composed body, both are examined; title/names; enabled book parts; captions; events; relations). Scope `publication` for compliance screening and revision re-screen; scope `preprint` for the final check before print (body + book parts + captions only). Catalogues `FINGERPRINT_READABLE_FIELDS`, `FINGERPRINT_NON_READABLE_FIELDS`, `NON_PUBLIC_TEXT_COLUMNS` keep screening aligned with the fingerprint and with text/jsonb columns in the PGlite test schema.
- **Screening record**: every time the screening examines a biography it writes a `kind = 'screening'` row with the fingerprint, the verdict (`passed`, `flagged`, `ai_error`, `parse_error`, `text_changed`), the scope (always `full`), `examined_chars` (sum of chunk bodies that received a valid verdict) and `source_chars` (the whole source text from the builder above). The text is split into chunks (`splitMarkdownIntoChunks`, max **23 863 tokens / 95 452 characters** per chunk — one quarter of Infomaniak’s 100 000-token window for Gemma 4 31B after prompt/output reserve); each chunk carries the previous paragraph as context. If any chunk lacks a valid verdict → `ai_error` and human queue. When every chunk succeeds, `examined_chars = source_chars`. **Safety rule retained:** if `examined_chars < source_chars` the biography is never published automatically (`screeningDetail: 'incomplete'`). Format-conversion rows (`reason = FORMAT_CONVERSION_REASON`) are not real screenings: `latestScreening` skips them. Screening, preprint check and revision screening run as background jobs (`analysis_jobs`, `lib/server/analysis-jobs.ts`): the HTTP routes return **202** immediately and the editor polls `GET /api/analysis-jobs`.
- **Publication**: every server path that sets `status = 'published'` goes through `gatedPublish`. It recomputes the fingerprint, compares it according to the mode, writes a `kind = 'publication'` row (mode, actor, the screening fingerprint it refers to) *before* the status update, then records the outcome. If the comparison fails, nothing is published and the caller answers with an explicit message; if the row cannot be written, nothing is published.

| Mode | Used by | Rule |
|---|---|---|
| `auto` | `runReviewSubmitScreening` (`/api/review/submit`, `/api/publication/approve-final-pdf`) | the fingerprint taken before the model call must equal the current one; checked **before** the UM identifier is minted. On mismatch the biography goes back to the queue (`under_review`, report "Text changed during screening", response `screeningDetail: 'text_changed'`) |
| `human_approval` | admin `approve`, moderation `decide` with `status: 'published'` | a screening record of exactly this text must exist (otherwise: re-run the screening, or force). After a reviewer-requested correction the record is created when the author sends it (see below) |
| `restore` | admin appeal upheld that returns to `published` | the text must equal the last publication (no earlier record: start from the current text) |
| `forced` | admin `force_publish` | no comparison; fingerprint and actor are always recorded |

**Correction requested by a reviewer.** When the author sends the correction (`POST /api/moderation/resubmit`, `revision_requested` to `revision_pending_review`) the server runs a screening of the corrected text **without publishing** (`screenRevisionAndAttach`, `lib/server/revision-screening.ts`). The result is attached to the open report (`ai_analysis.summary`, `flagged_passages`, `revision_screening`; the earlier analysis is kept in `previous_analysis`) and an internal message; the fingerprint goes in `publication_records`. The reviewer approves seeing it, and `gatedPublish` publishes only if the text is still exactly the one that was screened. If the screening cannot run, the author's submission still succeeds and the reviewer finds it written that it must be re-run (or use the forced publication, which leaves a trace).

`lib/__tests__/publish-paths.test.ts` fails if a new server file writes `status: 'published'` without going through `gatedPublish`.

### 6c. Reopening a published biography for a new chapter

`POST /api/biography/reopen` (owner only) moves `published` to `draft`, with the status written by the server, only if `next_chapter_available_at` has passed (365 days after the last publication). The wait is checked when reopening, not when republishing, so an author does not write a chapter that cannot be published. **Known limit:** while the new chapter is being written the biography is not published, so it disappears from the catalogue and from its public page; the editor says so before reopening. To be solved in the Markdown block with a separate working copy, keeping the published version online until the new one passes the screening.

---

## 7. PDF Export

**Library**: jsPDF. **Format**: B5 (176 × 250 mm). **Fonts**: Noto Serif (Regular, Bold, Italic, BoldItalic) embedded as base64 from `/public/fonts/noto-serif/`. Book-style alternating inner/outer margins.

### Document structure (in order)

1. Photo cover — title, author name, cover image
2. Blank page
3. Logo page
4. Credits / colophon
5. Title page (frontespizio)
6. Blank page
7. Front matter (if enabled): dedication → epigraph → preface
8. Main content — section chapters (section mode) or single chapter (freeflow); each with running header and page numbers
9. Photo gallery pages — four layout options: full-page, two-vertical, two-horizontal, three-mixed. jsPDF embeds JPEG files as they are, so the PDF weight follows the photo weight: with 15 full-page 12-megapixel photos the PDF is 61.1 MB with the original files and 7.0 MB with the processed ones (`lib/pdf/__tests__/pdf-with-photos.test.ts`, 2026-10-06)
10. Back matter (if enabled): epilogue → acknowledgements → specific credits
11. Back cover — author, date, copyright

### Draft watermarks

`pdf_draft_iteration` on the biography row (1–`PDF_DRAFT_MAX_ITERATION`, currently 30) controls the watermark text:
- 1 → "DRAFT"
- 2 → "SECOND DRAFT"
- 3 → "THIRD DRAFT — FINAL REVIEW"
- 4+ → generic “DRAFT N” / “BOZZA N” (and FR/DE equivalents) with the iteration number

Watermarks are rendered diagonally across every page. When the biography is published the field is null and no watermark is applied. Multi-language watermark text is supported.

### Readiness gate (`checkBiographyPdfReadiness`)

Before generating, the function validates: cover photo exists, title and author are set, biography mode is set, and at least one section (or freeflow field) has content. Errors are returned as a typed array so the UI can show specific actionable messages.

---

## 8. Key Patterns

**Service layer** — All Supabase queries are wrapped in service functions (`lib/*.ts`). Components never build raw Supabase queries; they call typed service functions and handle the returned data or errors.

**Upsert everywhere** — Checkpoints, section statuses, book structure, and section completions all use `upsert` with conflict targets. This avoids "row already exists" errors during concurrent auto-saves.

**Auto-save** — The editor debounces content changes and upserts the section row. Save status (`saved | saving | unsaved | error`) is tracked in component state and shown in the top bar.

**Graceful AI degradation** — Every AI feature has a non-blocking fallback. Conversation mode shows a pre-written acknowledgement; recommendations fall back to the first incomplete section; grammar suggestions simply do not appear on failure. The user can always continue writing without AI.

**i18n** — `I18nProvider` wraps the app and provides a `t()` translation function. Supported locales: `en`, `it`, `fr`, `de`. Biography content language is tracked separately from UI language — a French UI user can write an Italian biography.

**Admin guards** — `AdminGuard` component checks `profile.role` on mount and redirects non-privileged users. Role checks use the profile loaded by `AuthProvider` at login; no additional round-trips.

**Middleware** (`middleware.ts`) — defense in depth for staff routes: `/api/admin/*` requires Bearer JWT and staff role (`reviewer`, `admin`, `super_admin`); `/admin/*` enforces staff when a Supabase auth cookie is present (session is usually in localStorage, so client `AdminGuard` remains the primary gate for page routes). Does not replace Supabase RLS.
