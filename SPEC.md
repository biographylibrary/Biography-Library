# SPEC — Biography Library

**Specifica funzionale** focalizzata su stato attuale e lavoro in corso.

| Doc | Contenuto |
|-----|-----------|
| [`PRD.md`](PRD.md) | Requisiti prodotto e scope |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design system UI/PDF |
| [`README.md`](README.md) | Setup, script, contribute |
| [`.cursor/plans/`](.cursor/plans/) | Piani Cursor salvati nel workspace |

Ultimo aggiornamento: giugno 2026.

---

## Stato attuale (rilasciato / stabile)

### Account e biografie
- **Un account = una biografia** (autobiografia o memorial, scelta in `/onboarding`).
- Knowledge piattaforma per Echo/Help: [`docs/PLATFORM_KB.md`](docs/PLATFORM_KB.md) — aggiornare + `npm run kb:sync` + seed RAG dopo modifiche.

### Editor e contenuti
- Biografie con sezioni di vita o flusso libero
- Editor Tiptap con salvataggio su Supabase
- Galleria media con layout foto (`full-page`, `cover`, `two-vertical`, …)
- i18n completo per stringhe UI in 4 lingue

### Pubblicazione
- Invio in revisione via `POST /api/review/submit`
- Pipeline server: `lib/server/review-submit-pipeline.ts`
- Screening AI Infomaniak (Apertus) prima della coda moderazione
- Stati biografia: draft → in review → approved / revision needed → published

### Export PDF
- Generazione client (`lib/pdf-export.ts`) e server (`lib/export-server.ts`)
- Draft PDF con watermark; PDF finale via `approve-final-pdf` / `start-pdf-draft`
- Artifact storage: `lib/server/final-pdf-artifacts.ts`

### Admin
- Coda moderazione, gestione utenti, statistiche AI

---

## Stato v1.0 (giugno 2026)

### Pubblicazione PDF + draft AI review
- `POST /api/publication/draft-ai-review` — feedback AI strutturato dopo ogni round draft (max 3); persiste `draft_ai_feedback` e incrementa `pdf_draft_iteration`
- Copertina `cover_a5` full-bleed (`biography_media.layout`)
- Pagina copyright autore opzionale (`biography_book_structure.include_author_copyright_page`)
- Dialog export con pannello Draft AI Review (i18n EN/IT/FR/DE); severity 3 blocca approve in UI
- Migrazioni `20260508*` applicate su Supabase dev

### Admin v1
- UI lingue revisore in `/admin/users` (tabella `reviewer_languages`)
- `middleware.ts` — protezione server-side `/api/admin/*` (Bearer + ruolo staff); `/admin/*` enforcement quando cookie auth presente (client `AdminGuard` altrimenti)

### Verifica build (giugno 2026)
- [x] `npm run typecheck` — PASS
- [x] `npm run lint` — PASS
- [x] `npm run build` — PASS (warning Supabase realtime noto, nessun warning `docx`)
- [x] Migrazioni `20260508*` su Supabase dev
- [ ] Smoke E2E manuale flusso PDF completo in produzione (vedi [`TESTING.md`](TESTING.md))

---

## Work in progress (chiuso in v1.0 — riferimento implementazione)

### 1. Draft AI review

| Elemento | Dettaglio |
|----------|-----------|
| API | `POST /api/publication/draft-ai-review` |
| Pipeline | `runDraftAiReview` in `lib/server/review-submit-pipeline.ts` |
| DB | `biographies.draft_ai_feedback` (jsonb) |
| UI | `components/export/AdvancedExportDialog.tsx` |

**Verifica:**
- [x] Chiamata API senza auth → 401
- [x] Throttle per utente (`checkPerUserThrottle`) come `approve-final-pdf`
- [x] Feedback salvato su biografia e visibile in dialog export
- [x] Errori AI non espongono token al client

### 2. Struttura libro — pagina copyright autore

| Elemento | Dettaglio |
|----------|-----------|
| DB | `biography_book_structure.include_author_copyright_page` |
| UI | `components/editor/BookStructurePanel.tsx` |
| PDF | `lib/pdf-export.ts` |

**Verifica:**
- [x] Toggle persiste su DB
- [x] Stringhe i18n in 4 lingue
- [ ] PDF smoke: pagina visibile solo se flag attivo (test manuale)

### 3. Copertina A5 full-bleed

| Elemento | Dettaglio |
|----------|-----------|
| DB | layout `cover_a5` su `biography_media` |
| UI | `components/editor/PhotoGalleryPanel.tsx` |

**Verifica:**
- [x] Upload layout `cover_a5` in galleria
- [ ] PDF smoke: copertina senza distorsioni (test manuale)

### 4. Export avanzato e pipeline PDF

**Verifica:**
- [x] `npm run typecheck && npm run build` passano
- [x] Import dinamico `docx` in `lib/export-server.ts` + `serverComponentsExternalPackages`
- [ ] Export draft watermark + approve end-to-end (test manuale)

---

## Migrazioni da applicare (dev → prod)

In ordine di timestamp:

1. `20260508_add_draft_ai_feedback_to_biographies.sql`
2. `20260508120000_biography_media_cover_a5_layout.sql`
3. `20260508180000_biography_book_structure_author_copyright_page.sql`

Checklist deploy: [`docs/BETA_RELEASE_CHECKLIST.md`](docs/BETA_RELEASE_CHECKLIST.md)

---

## Criteri di verifica globali

| Area | Come verificare |
|------|-----------------|
| Build | `/verify-build` o `npm run typecheck && npm run lint && npm run build` |
| UI | Agente `verify-app` o smoke manuale su localhost:3000 |
| Sicurezza | Agente `security-reviewer` prima del merge |
| Release | Comando `/pre-release` |

---

## File di riferimento per implementazione

```
app/api/publication/draft-ai-review/route.ts
app/api/publication/start-pdf-draft/route.ts
app/api/publication/approve-final-pdf/route.ts
app/api/review/submit/route.ts
components/editor/BookStructurePanel.tsx
components/editor/PhotoGalleryPanel.tsx
components/export/AdvancedExportDialog.tsx
lib/pdf-export.ts
lib/export-server.ts
lib/server/review-submit-pipeline.ts
lib/server/final-pdf-artifacts.ts
supabase/migrations/20260508*.sql
```

Piano dettagliato WIP: [`.cursor/plans/pdf-export-and-ai-review.md`](.cursor/plans/pdf-export-and-ai-review.md)

---

## Issue noti (ricalibrati giugno 2026)

| Priorità | Problema | Stato |
|----------|----------|-------|
| ~~Critico~~ | Editor non bloccato durante `under_review` | **Risolto** — `reviewQueueLocksEditor` in `edit/page.tsx` |
| ~~Critico~~ | Link "Read" reviewer → 404 | **Risolto** — `/admin/review/[id]/read` in `admin/review/page.tsx` |
| ~~Importante~~ | Cover assente nella view page | **Risolto** — `listing_cover_url` + fallback cover media in `view/page.tsx` |
| Importante | Errore AI mappato come "flagged" | Da confermare in smoke — verificare messaggi in `edit/page.tsx` |
| ~~Minore~~ | `revision-history-service`, `smart-followup` senza UI | **Obsoleto** — usati da `AISectionReview.tsx` e `conversation-mode.tsx` |

## Feature parziali (backlog post-v1)

- Migrazione auth a cookie SSR (`@supabase/ssr`) per middleware `/admin` completo senza dipendere da `AdminGuard` client-side
- Test automatizzati Playwright (login + creazione biografia)

