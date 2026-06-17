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
| Deployment | Infomaniak Jelastic (produzione); `netlify.toml` è legacy, non usato |

---

## Documentation

| Document | Purpose |
|---|---|
| [`PRD.md`](./PRD.md) | Product requirements and scope |
| [`SPEC.md`](./SPEC.md) | Functional spec and work in progress |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | UI/PDF design system |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Local setup, env, production deploy |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture |
| [`TESTING.md`](./TESTING.md) | Manual AI feature testing guide |
| [`docs/BETA_RELEASE_CHECKLIST.md`](./docs/BETA_RELEASE_CHECKLIST.md) | Pre-release checklist |
| [`.cursor/`](./.cursor/) | Cursor rules, commands, agents, plans ([README](./.cursor/README.md)) |

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
cp .env.example .env.local
# Edit .env.local with your Supabase and Infomaniak credentials (see .env.example)

# 4. Apply database migrations
# Use the Supabase dashboard → SQL Editor, or the Supabase CLI:
supabase db push

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy [`.env.example`](./.env.example) to **`.env.local`** (never commit this file). Next.js loads `.env.local` automatically in development.

Required for local dev:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_MODEL`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_ENV` (optional but recommended)

Server-only routes (e.g. `/api/review/submit`) may also need `SUPABASE_SERVICE_ROLE_KEY` — see `.env.example` and `DEPLOYMENT.md`.

> **Edge Function secrets** (`INFOMANIAK_AI_TOKEN` etc.) must also be set in the Supabase dashboard so `ai-assistant`, `audio-transcription`, and related functions can reach the AI endpoint.

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

1. **Fork** the repository and create a branch from `main` (day-to-day work may use `main-sync` — merge to `main` via PR only).
2. **Check existing issues** before starting — comment to claim one.
3. **Follow conventions** — TypeScript strict, no comments unless logic is non-obvious, no new UI libraries. See [`.cursor/rules/`](./.cursor/rules/) for persistent Cursor guidance.
4. **Database changes** must be a new migration file in `supabase/migrations/` with a descriptive filename and SQL summary comment. Never use `DROP` or destructive operations.
5. **Run `npm run typecheck`, `npm run build`, and `npm run lint`** before pushing.
6. Open a **Pull Request** to `main` with a clear description (template in `.github/PULL_REQUEST_TEMPLATE.md`).
7. All contributions are subject to the AGPL v3 license.

**Cursor workflow:** use Plan mode for multi-file tasks; save plans in `.cursor/plans/`; slash commands in `.cursor/commands/` (e.g. `/verify-build`, `/commit-push-pr`).

For questions, open a GitHub issue or contact the maintainers at [biographylibrary.org](https://biographylibrary.org).
