# Biography Library — System Patterns & Architecture

## Struttura cartelle (Next.js 13 App Router)
```
app/
  (auth)/login, register, verify-email, forgot-password, reset-password
  dashboard/
  biography/[id]/edit/        ← editor principale
  biography/[id]/view/        ← pagina pubblica lettura
  biographies/                ← gallery pubblica
  create-biography/
  autobiography/declaration/
  deceased-biography/declaration/
  admin/                      ← protetto da AdminGuard
  api/review/submit/          ← route AI screening
  notifications/

components/
  editor/                     ← tutti i componenti dell'editor
  admin/                      ← AdminGuard, AdminNav, pannelli admin
  export/                     ← AdvancedExportDialog
  import/                     ← SectionAssignmentWizard

lib/
  auth-context.tsx            ← NON TOCCARE MAI senza analisi completa
  biographies.ts              ← CRUD biografie
  ai-service.ts               ← chiamate AI lato client
  ai/ai-provider.ts           ← rate limiting, AiLimitError
  pdf-export.ts               ← generazione PDF (complessa, ~1000 righe)
  export-utils.ts             ← TXT, RTF, DOCX
  i18n/translations.ts        ← TUTTE le stringhe UI in EN/IT/FR/DE
  supabase.ts                 ← client Supabase (anon + service role)
  logger.ts                   ← error logging verso Edge Function log-error

supabase/
  functions/ai-assistant/     ← Edge Function AI (Infomaniak Apertus)
  functions/log-error/        ← Edge Function error logging
  migrations/                 ← SQL migrations (seguire naming convention esistente)
```

## Pattern critici da rispettare

### 1. Autosave
- Interval 10 secondi con dirty-check
- `beforeunload` fallback
- Include: `author_name` (da `authorNameRef.current`), tutti i campi bio

### 2. i18n — REGOLA ASSOLUTA
- Ogni stringa visibile → chiave in `lib/i18n/translations.ts`
- Aggiungere la chiave in TUTTE e 4 le lingue (en/it/fr/de)
- Usare `useTranslation()` hook
- MAI hardcodare stringhe visibili in nessun componente

### 3. Edge Functions
- CORS: copiare ESATTAMENTE il pattern `isAllowedOrigin` da `ai-assistant/index.ts`
- `verify_jwt: false` su entrambe le funzioni — auth interna via `supabase.auth.getUser`
- Ogni handler deve chiamare `auth.getUser()` e restituire 401 se non autenticato
- Usare `SUPABASE_SERVICE_ROLE_KEY` (non anon) per write su tabelle con RLS

### 4. RLS — Regole Supabase
- OGNI nuova tabella deve avere RLS abilitato
- Policy pattern standard: `auth.uid() = user_id`
- Admin access: `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin'))`
- Reviewer access: aggiungere `OR profiles.role = 'reviewer'` dove necessario
- NON modificare migration esistenti — creare sempre nuova migration
- Naming convention migration: `YYYYMMDDHHMMSS_description.sql`

### 5. Auth Context
- `lib/auth-context.tsx` è il file più delicato — NON modificare senza analisi completa
- Espone: `user`, `loading`, `signIn`, `signUp`, `signOut`, `fontSize`, `setFontSize`, `role`, `aiEnabled`
- `loading` parte `true`, diventa `false` sia su authenticated che unauthenticated branch
- Nessun middleware server-side — protezione route è client-side (check `user` + `router.push`)

### 6. isPublished / editor lock
- `isPublished = biographyStatus === 'published' || isFrozen || isActiveSectionRevisionLocked`
- MANCANTE: `|| biographyStatus === 'under_review'` — bug noto da correggere
- `isPublished` viene passato come prop a SectionEditor e controlla `editable` di TipTap

### 7. PDF Export
- `lib/pdf-export.ts` è ~1000 righe — modificare con estrema cautela
- Preflight check in `checkBiographyPdfReadiness()` e `checkPdfPreflight()`
- Cover: query `biography_media` con `eq('layout', 'cover')`
- Noto Serif caricato da Google Fonts CDN — fallback silenzioso a Times New Roman

### 8. Error Logging
- `lib/logger.ts` → chiama Edge Function `log-error`
- Non-blocking, non throws, cattura i propri errori internamente
- Funzioni: `logError()`, `logWarn()`, `logInfo()`
- NON importare auth context in logger.ts (evitare circular imports)

### 9. Admin panel
- Protetto da `AdminGuard` (client-side role check)
- Usa `service_role` Supabase client per query admin (bypass RLS)
- AdminNav badge: conta `moderation_reports` con status `unassigned`/`in_review`

### 10. Tabelle principali
| Tabella | Uso |
|---|---|
| `profiles` | Utenti, ruoli, preferenze |
| `biographies` | Dati biografia, stato, slug, ai_screening_status |
| `biography_sections` | Contenuto per capitolo (sections mode) |
| `biography_media` | Foto caricate, layout, cover |
| `biography_book_structure` | Dedica, epigrafe, prefazione ecc. |
| `moderation_reports` | Segnalazioni AI e utenti |
| `flagged_sections` | Passaggi flaggati per revisione granulare |
| `ai_rate_limits` | Rate limiting burst (append-only) |
| `ai_usage_tracking` | Contatori giornalieri/settimanali |
| `user_notifications` | Inbox utente |
| `error_logs` | Log errori per sviluppatori (admin only) |
| `section_completion_tracking` | Stato completamento per capitolo |
| `biography_section_notes` | Note private per capitolo |
| `biography_todos` | Todo globali per biografia |
