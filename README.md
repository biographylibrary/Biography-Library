# Biography Library

A multilingual, open-source platform for writing, preserving, and sharing personal biographies and memoirs. Authors write section-by-section with optional AI assistance; biographies pass through an AI screening and human moderation workflow before publication.

Developed by **Biography Library Association**, a Swiss non-profit based in Lugano, Ticino.
Licensed under **AGPL v3** — see [LICENSE](./LICENSE).

---

## Key Features

- **Structured or free-flow editor** — write by life sections (Early Years, Family, Career…) or as a single narrative
- **AI writing assistant** — grammar checks, content expansion, and guided memory prompts (Infomaniak / Mistral)
- **Voice recording** — record and auto-transcribe memories directly in the editor
- **Publication workflow** — AI pre-screening → human moderation → publish, with revision cycles
- **PDF export** — professional multi-page PDF with cover photo, dedication, epilogue, and up to 3 draft watermarks
- **Multilingual UI** — English, Italiano, Français, Deutsch; each biography can be in its own language
- **Privacy controls** — private / link-only / public visibility with share-token access
- **Admin panel** — moderation queue, user management, AI usage stats
- **PWA** — installable on mobile devices

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 13 (App Router) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| Serverless | Supabase Edge Functions (Deno) |
| AI | Infomaniak AI Tools (OpenAI-compatible, Mistral) |
| Editor | Tiptap |
| Styling | Tailwind CSS + shadcn/ui |
| PDF | jsPDF |
| Deployment | Netlify |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)

### Steps

```bash
# 1. Clone
git clone <repository-url>
cd biography-library

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials (see below)

# 4. Apply database migrations
# Use the Supabase dashboard → SQL Editor, or the Supabase CLI:
supabase db push

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Required — Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Required for AI features — set in Supabase Edge Function secrets
INFOMANIAK_AI_TOKEN=your_token
INFOMANIAK_AI_ENDPOINT=https://api.infomaniak.com/2/ai/107001/openai/v1/chat/completions
INFOMANIAK_AI_MODEL=mistral3

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
```

> **AI secrets** (`INFOMANIAK_AI_TOKEN` etc.) must also be added to your Supabase project's Edge Function secrets so the `ai-assistant` and `audio-transcription` functions can reach the AI endpoint.

---

## Project Structure

```
app/                    # Next.js pages (App Router)
  biography/[id]/       # Editor and public view
  admin/                # Moderation, users, AI stats
  api/review/submit/    # Publication API route
components/
  editor/               # Section editor, AI panel, export dialogs
  admin/                # Moderation UI
  dashboard/            # Dashboard cards
lib/
  ai/                   # AI client, narrative service, smart follow-up
  i18n/                 # Translation strings and context
  moderation/           # Moderation actions and types
  pdf-export.ts         # PDF generation
supabase/
  functions/            # Edge Functions (ai-assistant, audio-transcription, help-assistant)
  migrations/           # Ordered SQL migrations
```

---

## Useful Scripts

```bash
npm run dev         # Start dev server
npm run build       # Production build (run before opening a PR)
npm run typecheck   # TypeScript check without emitting
npm run lint        # ESLint
```

---

## How to Contribute

1. **Fork** the repository and create a branch from `main`.
2. **Check existing issues** before starting — comment to claim one.
3. **Follow conventions** — TypeScript strict, no comments unless logic is non-obvious, no new UI libraries.
4. **Database changes** must be a new migration file in `supabase/migrations/` with a descriptive filename and SQL summary comment. Never use `DROP` or destructive operations.
5. **Run `npm run build` and `npm run typecheck`** before pushing — the PR will be blocked otherwise.
6. Open a **Pull Request** with a clear description of what changed and why.
7. All contributions are subject to the AGPL v3 license.

For questions, open a GitHub issue or contact the maintainers at [biographylibrary.org](https://biographylibrary.org).
