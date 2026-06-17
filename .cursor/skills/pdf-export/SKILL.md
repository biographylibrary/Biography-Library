# Skill: PDF export

Usa questa skill quando lavori su export PDF, copertine, watermark draft, o artifact PDF finali.

## Architettura

| Layer | File | Ruolo |
|-------|------|-------|
| Client PDF | `lib/pdf-export.ts` | Generazione jsPDF lato browser (anteprima, download) |
| Server export | `lib/export-server.ts` | Logica server condivisa, rendering pesante |
| Artifact storage | `lib/server/final-pdf-artifacts.ts` | Upload/download PDF finali su Supabase Storage |
| UI | `components/export/AdvancedExportDialog.tsx` | Dialog export avanzato nell'editor |
| API draft | `app/api/publication/start-pdf-draft/route.ts` | Avvia generazione draft |
| API approve | `app/api/publication/approve-final-pdf/route.ts` | Approva e salva PDF finale |
| AI review | `app/api/publication/draft-ai-review/route.ts` | Feedback AI su draft |

## Layout copertina media

Valori `biography_media.layout` (CHECK constraint):
- `full-page`, `cover`, `cover_a5`, `two-vertical`, `two-horizontal`, `three-mixed`

**`cover_a5`:** copertina full-bleed formato A5 per stampa. UI in `PhotoGalleryPanel.tsx`.

## Struttura libro

Config in `biography_book_structure` (pannello `BookStructurePanel.tsx`):
- Front matter: dedica, epigrafe, prefazione
- Back matter: epilogo, ringraziamenti, crediti
- `include_author_copyright_page` — foglio opzionale autore/copyright all'inizio

## Watermark draft

- Max 3 watermark su PDF draft (business rule esistente)
- PDF finale senza watermark dopo approvazione

## Design system PDF

Allineare a `docs/DESIGN.md`:
- Tipografia: Noto Sans (UI) / Noto Serif (titoli e corpo narrativo)
- Colori: token `brand-*` da `lib/ui-palette.ts`
- Formato pagina: A5 per export stampa

## Verifica

1. `npm run typecheck && npm run build`
2. Export draft da editor → PDF scaricato con watermark e copertina corretta
3. Confronto anteprima dialog vs file scaricato
4. Pipeline approve → artifact in storage accessibile

## Migrazioni correlate

- `20260508120000_biography_media_cover_a5_layout.sql`
- `20260508180000_biography_book_structure_author_copyright_page.sql`
- `20260508_add_draft_ai_feedback_to_biographies.sql`
