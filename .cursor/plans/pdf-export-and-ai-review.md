# Piano: PDF export e AI draft review

**Stato:** completato (v1.0)  
**Riferimento:** [`SPEC.md`](../../SPEC.md)  
**Data:** giugno 2026

---

## Completato

- [x] Migrazione `cover_a5` su `biography_media`
- [x] Migrazione `include_author_copyright_page` su `biography_book_structure`
- [x] Migrazione `draft_ai_feedback` jsonb su `biographies`
- [x] Route `draft-ai-review` con pipeline in `review-submit-pipeline.ts`
- [x] Estensioni `PhotoGalleryPanel`, `BookStructurePanel`, `AdvancedExportDialog`
- [x] Refactor `lib/pdf-export.ts` e `lib/export-server.ts` (import dinamico `docx`)
- [x] Stringhe i18n Draft AI Review in `translations.ts` (4 lingue)
- [x] Documento `docs/DESIGN.md`
- [x] `npm run typecheck` — PASS
- [x] `npm run lint` — PASS
- [x] `npm run build` — PASS
- [x] Migrazioni applicate su Supabase dev
- [x] Security review: auth + ownership + throttle su API publication

---

## Smoke manuale residuo (pre-prod)

- [ ] Export PDF con `cover_a5` e copyright page
- [ ] Flusso end-to-end draft → AI feedback → approve → publish/review
- [ ] Vedi [`TESTING.md`](../../TESTING.md) sezione "Publication PDF flow"

---

## File toccati

```
app/api/publication/draft-ai-review/route.ts
app/api/publication/start-pdf-draft/route.ts
app/api/publication/approve-final-pdf/route.ts
components/editor/BookStructurePanel.tsx
components/editor/PhotoGalleryPanel.tsx
components/export/AdvancedExportDialog.tsx
lib/pdf-export.ts
lib/export-server.ts
lib/server/review-submit-pipeline.ts
lib/i18n/translations.ts
middleware.ts
app/admin/users/page.tsx
supabase/migrations/20260508*.sql
```
