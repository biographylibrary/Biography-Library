# Changelog

All notable changes are recorded here. Dates match migration timestamps where applicable.

---

## [Unreleased]

---

## [0.9.0] — 2026-04-01

### Biography workflow

- **Publication status canonicalised** — `biography_status` constraint consolidated to a single source of truth; `removed` status added for moderation-triggered takedowns.
- **Frozen biographies** — `is_frozen` column; RLS UPDATE-block policy prevents any edit once frozen. `is_locked` column removed (superseded by freeze).
- **AI screening** — `ai_screening_status` column tracks whether a biography has passed automated pre-publication review (`pending` → `passed` / `failed` / `ai_error`).
- **Reviewed-by tracking** — `reviewed_by` and `reviewed_at` columns record which staff member approved or rejected a biography.
- **PDF draft iteration** — `pdf_draft_iteration` counter incremented on each export to version generated PDFs.

### Moderation

- **Moderation report types expanded** — missing enum values added to the `report_type` constraint.
- **Moderator notes migrated to JSONB** — previously a plain text field; now a structured JSONB array to support timestamped, multi-author notes.
- **Admin/staff read policies** — staff roles can read `ai_rate_limits` for usage monitoring; auto-cleanup removes records older than 30 days.

### Database hygiene

- `section_key NOT NULL` enforced on `biography_sections`.
- Unindexed foreign keys indexed; unused indexes dropped.
- RLS `auth.uid()` initialisation plan fixed to avoid per-row re-evaluation overhead.
- `SECURITY DEFINER` helper function introduced to break RLS recursion on `profiles`.
- Function `search_path` pinned to `public, pg_temp` to prevent search-path injection.

---

## [0.8.0] — 2026-03-31

### Share / anon access

- **Share-token biography access** — anonymous visitors can view biographies via a signed token without logging in.
- **`get_biography_by_share_token` RPC** extended to return section content alongside biography metadata.
- **RLS tightened** — `link_only` visibility excluded from the general anon SELECT policy; token-gated access is the only anon path into private content.
- Section `created_at` / `updated_at` timestamps exposed for anon token requests.

### Error logging

- `error_logs` table created; `log-error` Edge Function receives structured client-side error reports (level, message, source URL, user agent).

---

## [0.8.0-beta] — 2026-03-29

### Biography library (public)

- `visibility` column (`public` / `link_only` / `private`) replaces the old `privacy_level` field.
- `biography_type` column distinguishes autobiography vs. biography of a deceased subject.
- `slug` column added for future SEO-friendly URLs.
- `cover_mode` column added then immediately removed after design change.

### AI screening

- `ai_screening_status` column scaffolded in this release (constraint finalised in 0.9.0).

---

## [0.7.0] — 2026-03-28

### Book structure

- `biography_book_structure` table stores ordered chapter/part outlines separate from the section editor.
- `BookStructurePanel` component added to the workspace editor sidebar.

### Biography modes

- `biography_mode` column (`guided` / `freeflow`) controls whether the AI coach drives the writing or the user writes freely.
- `freeflow_content` column stores unstructured prose for freeflow mode.

---

## [0.6.0] — 2026-03-25

### Admin panel

- Admin panel with user management, biography overview, and moderation queue.
- `profiles.role` column: `user` / `reviewer` / `admin` / `super_admin`.
- `reviewer_languages` table: reviewers declare which languages they can review.
- `role_change_log` and `admin_action_log` tables for audit trail.
- `moderation_reports` table; report/dismiss workflow for published content.
- User notifications table; server-side notification dispatch on biography status change.

### AI usage

- Per-user daily (40) and weekly (200) AI request caps tracked in `ai_rate_limits`.
- `model_used` column records which Infomaniak model served each request.
- Primary model: `Apertus-70B-Instruct-2509`; fallback: `mistral3`.

---

## [0.5.0] — 2026-03-23

### Media

- `biography_media` table stores photo metadata (Supabase Storage URLs, captions, ordering).
- `PhotoGalleryPanel` added to the editor.

### Privacy / legal

- `privacy_level` column dropped (migrated to new `visibility` field, landed in 0.8.0-beta).

---

## [0.4.0] — 2026-02-09

### User preferences

- `ai_features_enabled` flag per profile — users can disable AI suggestions entirely.
- Font-size preferences (`editor_font_size`, `ui_font_size`) stored in `profiles`.

### Account management

- `delete_user` SQL function allows full account deletion (cascades to biography data).

---

## [0.3.0] — 2026-02-08

### Section workflow

- Section completion tracking: `completed_at`, `completed_by` on `biography_sections`.
- Publication workflow: `submitted_at`, `published_at`, review status columns on `biographies`.

---

## [0.2.0] — 2026-02-07

### Editor

- `section_key` column added to `biography_sections` to identify sections by stable key rather than position.
- Section notes and per-section todo items (`section_notes`, `section_todos` tables).
- Section status tracking (`draft` / `in_progress` / `complete`).
- Conversation checkpoints: save/restore mid-session AI conversation state.

### Internationalisation

- Language support added to `biographies` and `profiles`; UI strings externalised to `lib/i18n/translations.ts`.
- Languages supported: English, Italian, French, German.

---

## [0.1.0] — 2026-02-05

### Initial schema

- `profiles`, `biographies`, `biography_sections` tables with RLS.
- `handle_new_user` trigger populates `profiles` on Supabase Auth sign-up.
- `ai_rate_limits` table with per-minute rate enforcement (5 requests/min default).
- Privacy and status fields on biographies (`is_public`, `status`).
- `author_name` column for biographies of third parties.
