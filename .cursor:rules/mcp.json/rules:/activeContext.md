# Biography Library — Active Context (Aprile 2026)

## Stato attuale
- **Versione**: v1.0 (feature-complete per MVP)
- **Branch attivo**: `main-sync`
- **79 feature WORKING, 11 PARTIAL, 0 BROKEN, 1 MISSING**
- Strumento di sviluppo precedente: Bolt.new
- Strumento attuale: Cursor (locale, macOS)

## Setup ambiente locale
```bash
cd biography-library
npm install
cp .env.example .env.local
# Inserire le variabili Supabase + INFOMANIAK_API_TOKEN in .env.local
npm run dev
```

## Bug critici noti (da fixare in ordine di priorità)

### CRITICO
1. **Editor non si blocca durante `under_review`**
   - File: `app/biography/[id]/edit/page.tsx` righe 1477, 1508
   - Fix: aggiungere `|| biographyStatus === 'under_review'` alla condizione `isPublished`

2. **Reviewer "Read" link → 404**
   - File: `app/admin/review/page.tsx` righe 516-525
   - Causa: view page richiede `status = 'published'`, ma biografie under_review hanno `status = 'under_review'`

### IMPORTANTE
3. **Cover image assente nella view page**
   - File: `app/biography/[id]/view/page.tsx`

4. **AI error mappato silenziosamente come "flagged"**
   - File: `app/biography/[id]/edit/page.tsx` righe 1084-1144

5. **Submit button invisibile in sections mode**
   - Appare solo quando `allSectionsComplete && biographyStatus === 'draft'`

### MINOR
6. **isfeatured toggle** — wiring DB non confermato in `BiographyDetailPanel`
7. **Author name** — invisibile su mobile (hidden `sm:block`)
8. **Language filter gallery** — non pre-seleziona lingua UI utente
9. **Noto Serif** — fallback silenzioso a Times New Roman se CDN lento

## Feature PARTIAL non ancora cablate all'UI
- `lib/revision-history-service.ts` — implementato, nessun call site
- `lib/ai/smart-followup.ts` — implementato, nessun call site
- `lib/ai/narrative-structure-service.ts` — integrazione parziale in FinalReviewDialog
- `components/editor/next-section-prompt.tsx` — componente esiste, non renderizzato
- `reviewer_languages` table — schema OK, `pickReviewer` ignora la lingua

## Milestone completate ✅
- ✅ **Integrazione AI svizzera** — Infomaniak Apertus (Mistral) attivo in produzione
- ✅ **Open source release** — repo pubblico su GitHub (AGPL-3.0)
- ✅ **Self-hosting su Infomaniak Jelastic** — app deployata in Svizzera
- ✅ **Voice transcription** — Infomaniak Whisper API attiva, Web Speech API rimossa completamente

## Backlog v1.1 (dopo lancio MVP)
- Offline draft saving / queue
- Capitoli autobiografia (uno ogni 365 giorni)
- Server-side middleware route protection
- Migrazione database da Supabase Cloud a Infomaniak

## Fase 2 (non urgente, post-lancio)
- W3C Verifiable Credentials per biografie certificate
- ActivityPub federation per scoperta pubblica biografie

## Regole di sviluppo per questa sessione Cursor
1. **Chirurgico**: modificare solo i file necessari, confermare prima cosa si tocca
2. **Sequenziale**: un fix alla volta, confermare prima di procedere al successivo
3. **Non rompere auth**: mai modificare `lib/auth-context.tsx` senza analisi completa
4. **Sempre tradurre**: ogni nuova stringa → tutte e 4 le lingue in `translations.ts`
5. **Migration sempre nuova**: mai modificare migration esistenti
6. **Build deve passare**: zero TypeScript errors prima di confermare done
7. **Conferma file toccati**: alla fine di ogni task, elencare esattamente i file modificati
