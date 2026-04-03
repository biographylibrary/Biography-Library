# Biography Library — Project Brief

## Cos'è
Biography Library è una piattaforma web che permette a chiunque di scrivere la propria autobiografia o quella di un familiare deceduto, e di conservarla in un archivio digitale sicuro, esportabile in PDF libro (B5), DOCX, RTF, TXT.

## Mission
Aiutare chiunque a lasciare una traccia scritta della propria vita. Non solo i famosi.

## Fondatore
Claudio Brignole — pioniere della comunicazione Hip Hop in Italia, fondatore di Aelle Hip Hop Magazine (1991), comunicatore e video maker. Sede: Lugano, Svizzera.

## Valori non negoziabili (dal Manifesto)
- Hosting esclusivamente svizzero (Infomaniak Jelastic) — dati sotto legge GDPR e nLPD svizzera
- AI etica e sovrana: Infomaniak Apertus (LLM Mistral) per testi — nessun dato agli USA
- **Open source** (AGPL-3.0) — codice pubblico su GitHub, dati degli utenti protetti
- I diritti sulla storia restano all'autore — Biography Library non rivendica nulla
- Archivio pensato per durare 10.000 anni — trasferibile a istituzione culturale in caso di chiusura
- Nessun AI commerciale/proprietario può usare l'archivio per training
- Registrazione aperta, accesso al backend solo per ruoli promossi manualmente

## Governance e struttura
- Struttura **nonprofit** con governance board (in costituzione)
- Il board supervisiona le decisioni architetturali e la sostenibilità dell'archivio
- Contribuzioni esterne welcome sotto licenza AGPL-3.0

## Stack tecnico
- **Frontend**: Next.js 13.5.1, TypeScript 5.2.2, React 18.2.0
- **Styling**: Tailwind CSS 3.3.3, shadcn/ui (Radix UI)
- **Editor**: TipTap (rich text), freeflow textarea
- **Database**: Supabase Cloud (PostgreSQL + Auth + Storage + Edge Functions) — migrazione futura su Infomaniak
- **AI testi**: Infomaniak Apertus API (Mistral) via Edge Function `ai-assistant` ✅
- **AI audio**: Infomaniak Whisper API (voice transcription) ✅ attivo
- **PDF**: jsPDF 4.1.0, B5 format (176x250mm), Noto Serif
- **Export**: DOCX (docx 8.5.0), RTF (rtf.js), TXT
- **i18n**: next-intl 4.8.2, 4 lingue (EN/IT/FR/DE)
- **PWA**: next-pwa, service worker, manifest
- **Deploy**: Infomaniak Jelastic (Docker), CI/CD GitHub Actions
- **Repo**: https://github.com/BiographyLibrary/biography-library (pubblico, AGPL-3.0)
- **Branch attivo sviluppo**: main-sync

## Roadmap infrastruttura
- **Ora**: Supabase Cloud (database + auth + storage) + Infomaniak Jelastic (app)
- **Futuro**: migrazione completa su Infomaniak — anche database e storage in Svizzera

## Lingue UI supportate
Inglese, Italiano, Francese, Tedesco — ogni stringa visibile DEVE avere la traduzione in tutte e 4 le lingue nel file `lib/i18n/translations.ts`. Mai hardcodare stringhe visibili.
