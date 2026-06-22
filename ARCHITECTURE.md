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
  revision-history-service  Per-section version tracking
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
| `biographies` | One row per biography. Key fields: `biography_mode` (sections/freeflow), `status`, `visibility`, `ai_screening_status`, `is_frozen`, `content_language` |
| `biography_sections` | One row per (biography, section_key). Stores content, draft version, status, revision history array |
| `biography_book_structure` | Front/back matter (dedication, epigraph, preface, epilogue, acknowledgements, specific_credits as JSONB) |
| `biography_media` | Photos: file_url, layout hint, display_order, caption |
| `conversation_checkpoints` | AI conversation state per (user, biography, section): conversation_log, answers, questions_completed |
| `section_completions` | Lightweight completion flags per (biography, section_key) |
| `moderation_reports` | Content review records: reporter_id, report_type, ai_analysis JSONB, flagged passages, status, decision |
| `ai_rate_limits` | Per-user request tracking for daily/weekly quota enforcement |
| `user_notifications` | In-app alerts sent to users after moderation decisions |
| `admin_action_log` | Audit trail for all admin actions |
| `error_logs` | Client-side errors sent via the `log-error` Edge Function |

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

Draft increments happen when the user saves a revised version. `section_status-service.ts` owns these transitions. `revision-history-service.ts` stores snapshots so previous versions can be restored.

The editor UI renders a `SectionSidebar` for navigation and a `SectionEditor` (Tiptap rich text) for the active section. An AI conversation mode (`ConversationMode`) guides the user through prompts before they write, storing the dialogue in `conversation_checkpoints`.

### Freeflow mode

A single continuous rich-text field (`content_freeflow` on the `biographies` row). No section sidebar, no per-section status tracking. Suitable for users who want to write without structure. The same Tiptap editor is used; the AI assistant still works but without section-specific context.

### Book structure (both modes)

`biography_book_structure` holds optional front and back matter (dedication, epigraph, preface, epilogue, acknowledgements). Enabled/disabled per field. The `BookStructurePanel` component manages this data and it is rendered in the PDF regardless of editor mode.

---

## 5. AI Pipeline

### Infrastructure

All AI calls from the browser go through **Supabase Edge Functions** (Deno). The browser never holds an AI API key. Two functions handle AI workloads:

| Function | Role |
|---|---|
| `ai-assistant` | All text AI actions (grammar, prompts, rewrite, follow-up, analysis) |
| `audio-transcription` | Audio file → transcript via Infomaniak Whisper endpoint |
| `help-assistant` | In-app help chatbot; searches a local knowledge base before calling AI |

The AI provider is **Infomaniak AI Services** (OpenAI-compatible endpoint, CH). Default models (2026): `google/gemma-4-31B-it` for `ai-assistant` and screening routes; `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8` for `help-assistant`. Configurable via Edge Function secrets or host env (`INFOMANIAK_AI_MODEL` on Next.js). Credentials are never in the client bundle.

### Client call flow (`lib/ai/ai-client.ts`)

```
Component calls aiService.*(...)
  → lib/ai/ai-provider.ts builds payload
  → lib/ai/ai-client.ts callAI(action, payload)
      → refresh JWT if < 300s remaining
      → POST /functions/v1/ai-assistant  {action, ...payload}
      → handle 401 (retry once after refresh)
      → handle 429 → throw AiLimitError (shows usage indicator)
      → parse JSON response
```

Timeout: 35 seconds. All AI calls are fire-and-respond; there is no streaming.

### AI actions

| Action | Service function | Returns |
|---|---|---|
| `grammar` | `checkGrammar()` | Array of `{original, suggestion, type, priority}` |
| `prompts` | `getGuidedPrompts()` | Array of guided writing prompts for the section |
| `summary` | `getSummary()` | Short text summary |
| `rewrite` | `rewriteSection()` | Rewritten text in chosen tone |
| `followup` | `analyzeAndRespond()` | Next question + acknowledgement for conversation mode |
| `analyze-themes` | `analyzeThemes()` | Thematic analysis across completed sections |
| `propose-structures` | `proposeNarrativeStructures()` | Alternative chapter orderings |
| `recommend-next-section` | `recommendNextSection()` | Suggested next section key + reason |

### Rate limiting

Tracked in `ai_rate_limits`. Limits: 5 requests per minute, 40 per day, 200 per week per user. The Edge Function checks and increments the counter atomically. The `AiUsageIndicator` component shows remaining quota. Old records are cleaned up automatically (30-day retention via a scheduled policy).

### Conversation mode

`ConversationMode` runs a multi-turn guided interview before the user writes a section. State is saved to `conversation_checkpoints` after each exchange so sessions survive page reloads. The service tracks `questions_completed`, `is_follow_up`, and `has_had_follow_up` to avoid repetitive questions. If the AI call fails, a pre-written fallback acknowledgement (in all four supported languages) is shown so the UX never blocks.

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

On re-submission after `returned`, the AI re-screens only the previously flagged sections (not the full biography). The old report is closed when the new decision is made.

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
| `pdf_draft` | Watermarked PDF draft rounds; `pdf_draft_iteration` 1–3; optional `pdf_draft_started_at` |
| `locked_pending_screening` | Final PDF approved; text locked; collateral generated; AI screening next; optional `final_pdf_approved_at` |
| `under_review` | Human reviewer queue (after AI flags / errors), or legacy path |
| `published` | Live per visibility |
| `removed` | Moderation take-down |

Helpers: `lib/publication-state.ts` (`isAuthorTextEditableStatus`, `isReviewOrScreeningLockStatus`, etc.).

**API (phase 2 — implemented)**

| Route | Purpose |
|-------|---------|
| `POST /api/publication/start-pdf-draft` | `final_version` → `pdf_draft`; sets `pdf_draft_started_at`, clears `pdf_draft_iteration` and `draft_ai_feedback` |
| `POST /api/publication/draft-ai-review` | After each watermarked draft download: runs `runDraftAiReview`, increments `pdf_draft_iteration` (1–3), stores `draft_ai_feedback` jsonb |
| `POST /api/publication/approve-final-pdf` | Requires `pdf_draft` + `pdf_draft_iteration` 1–3; locks → `locked_pending_screening`; `await` TXT/DOCX export; runs AI screening (shared `lib/server/review-submit-pipeline.ts`). Severity-3 draft AI flags force `under_review` before screening. |
| `POST /api/review/submit` | Legacy path + rescreen; uses same pipeline |

Watermarked PDF downloads are blocked while `status === 'final_version'` until the author starts the PDF phase (export dialog shows `draftPhaseRequiredBeforeDraft`). After each draft PDF export, the client calls `draft-ai-review`; feedback is shown in `AdvancedExportDialog` (severity 3 blocks final approval in UI).

**Cover assets (v1)**

- **`cover_a5`** layout on `biography_media` — full-bleed A5 cover for print PDF (`PhotoGalleryPanel`, migration `20260508120000_...`). `start-pdf-draft` and `approve-final-pdf` accept `cover` or `cover_a5`.
- **`include_author_copyright_page`** on `biography_book_structure` — optional author/copyright sheet at book start (`BookStructurePanel`, `lib/pdf-export.ts`). See [`docs/DESIGN.md`](docs/DESIGN.md) for layout tokens.

**Final PDF + catalogue cover (phase 3)**

- On **approve final PDF** (`POST /api/publication/approve-final-pdf`), before locking for screening, the server generates the **full book PDF** (no watermark) via `generateBiographyPDF(…, returnArrayBuffer: true)` with the service-role Supabase client (`lib/server/final-pdf-artifacts.ts`, `setPdfExportSupabaseClient`). Fonts load from `public/fonts/noto-serif` on the server filesystem.
- The file is uploaded to **`biography-exports/{biography_id}/final.pdf`** and **`final_pdf_url`** is stored on `biographies`.
- **`listing_cover_url`** is a **JPEG raster of PDF page 1** produced server-side with **`pdfjs-dist`** + **`@napi-rs/canvas`** (`lib/server/render-pdf-first-page-jpeg.ts`), uploaded as `biography-exports/{id}/listing-cover.jpg`. The public catalogue and the **reader view** prefer it when set; otherwise they fall back to the **`biography_media` cover photo** (`app/biographies/page.tsx`, `app/biography/[id]/view/page.tsx`). Link-only share links receive `listing_cover_url` via **`get_biography_by_share_token`** (migration `20260403210000_share_token_rpc_listing_cover.sql`).
- Legacy **Submit for review** from **`draft`** or **`sections_complete`** (without final-version / PDF flow) remains available; the editor shows **`publicationLegacySubmitHint`** nudging authors toward Final Review → PDF path.

**1. PDF draft rounds (replaces current submit)**

- The author downloads a **full PDF** with draft watermark on **every** page (iterations 1–3 via `pdf_draft_iteration`, e.g. first / second / third draft; third round is the last chance to change content before locking).
- After each download, the UI asks whether everything is OK or they want changes.
- **If OK on the approved round:** generate the **final** PDF (no watermark), **lock text** definitively, and generate **.txt** and **.docx** collateral per existing export rules.
- **“CSS rules” for cover / back cover** means the **layout rules already encoded in the PDF pipeline** (measurements, colours, fonts in `lib/pdf-export.ts` / jsPDF — not a separate HTML/CSS export). Implementation must be verified against this spec.
- **Cover image assets for listings** (grid, biography page) are **rasterised from the first page of the approved final PDF** (e.g. JPG/WebP derivatives at defined sizes). The public biography page layout will be redesigned to show this asset at a **medium** size (not huge, not tiny).

**2. After PDF approval (order of operations)**

1. Content is locked; collateral files generated as above.
2. **AI screening** runs on the content.
3. **If AI finds no flags:** **publish** according to visibility (cover raster is already generated at approve-final); the biography appears in the public catalogue / search when visibility is public.
4. **If AI finds flags:** the biography does **not** auto-publish. **Only the flagged sections** return to editable state (`under_review` + partial unlock in the editor from `moderation_reports.ai_analysis.flagged_passages`; authors with a long **final_version** use **FinalVersionEditor** unlocked for edits). **Re-screening** (`POST /api/review/submit` again) sends only the flagged section keys to the text builder when per-section rows exist; if the live text lives only in **`final_version`**, the pipeline falls back to that full HTML and passes the same section labels into the AI prompt as **focus hints** so `section_key` in the JSON stays aligned with the sidebar. Not a full new PDF draft cycle unless product extends this.

**3. Human reviewer vs auto-publish**

- If the **AI approves** (nothing to flag): **automatic publication** (no human reviewer queue for that path).
- If the **AI does not approve** (flags): enter the **existing reviewer flow** — reviewer sees **only problematic excerpts**, not the full book; author is notified; author corrects **flagged sections**; re-review; approval or rejection as today.

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
9. Photo gallery pages — four layout options: full-page, two-vertical, two-horizontal, three-mixed
10. Back matter (if enabled): epilogue → acknowledgements → specific credits
11. Back cover — author, date, copyright

### Draft watermarks

`pdf_draft_iteration` on the biography row (1–3) controls the watermark text:
- 1 → "DRAFT"
- 2 → "SECOND DRAFT"
- 3 → "THIRD DRAFT — FINAL REVIEW"

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
