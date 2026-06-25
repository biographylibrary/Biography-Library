# Deployment Guide

How to run the project locally and how it is deployed to production.

Related docs: [`README.md`](README.md) · [`PRD.md`](PRD.md) · [`SPEC.md`](SPEC.md) · [`docs/BETA_RELEASE_CHECKLIST.md`](docs/BETA_RELEASE_CHECKLIST.md) · [`.cursor/`](.cursor/)

---

## Stack at a glance


| Layer                            | Service                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| Frontend + API routes            | Next.js 13 (App Router), hosted on Infomaniak Jelastic (Node container) |
| Database + Auth + Edge Functions | Supabase (managed Postgres + Deno runtime)                              |
| AI provider                      | Infomaniak AI Services (OpenAI-compatible, hosted in CH)                 |
| Development environment          | Bolt (browser-based IDE) → GitHub                                       |
| Static asset CDN                 | Supabase Storage (biography media / photos)                             |


---

## Local development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- An Infomaniak AI Tools product ID and API token

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd biography-library

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# INFOMANIAK_AI_ENDPOINT, INFOMANIAK_AI_TOKEN

# 4. Apply all migrations to your Supabase project
# Use the Supabase MCP tool or the dashboard SQL editor.
# Migrations are in supabase/migrations/ — apply in filename order.

# 5. Deploy Edge Functions
# Use the Supabase MCP deploy_edge_function tool for each function:
#   ai-assistant, audio-transcription, help-assistant, log-error
# Then set Edge Function secrets in the Supabase dashboard:
#   INFOMANIAK_AI_TOKEN, INFOMANIAK_AI_ENDPOINT,
#   INFOMANIAK_AI_MODEL_PRIMARY, INFOMANIAK_AI_MODEL_FALLBACK (ai-assistant)
#   INFOMANIAK_AI_MODEL_HELP_PRIMARY, INFOMANIAK_AI_MODEL_HELP_FALLBACK (help-assistant)

# 6. Start the dev server
npm run dev
```

The app runs on `http://localhost:3000`. Hot reload is active. Edge Functions run on the remote Supabase project even in local dev — there is no local Supabase CLI setup in this workflow.

### Useful dev commands

```bash
npm run build      # Production build (catches type errors missed by the dev server)
npm run typecheck  # tsc --noEmit without emitting files
npm run lint       # ESLint
npm run kb:sync    # Regenerate EN KB from docs/PLATFORM_KB.md (Echo/Help RAG)
npm run kb:sync:check  # Fail if generated KB files are out of date
```

---

## Environment variables

See `.env.example` for the full annotated list. The short version:


| Variable                                | Where it lives                 | Used by                                                 |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | `.env.local` / host env        | Next.js (client + server)                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | `.env.local` / host env        | Next.js (client + server)                               |
| `SUPABASE_SERVICE_ROLE_KEY`             | `.env.local` / host env        | Server API routes (`/api/review/submit`, `/api/agents/*`, publication) |
| `INFOMANIAK_AI_ENDPOINT`                | `.env.local` / host env        | `/api/review/submit`, `/api/agents/*`                                   |
| `INFOMANIAK_AI_TOKEN`                   | `.env.local` / host env        | `/api/review/submit`, `/api/agents/*`                                   |
| `INFOMANIAK_AI_MODEL`                   | `.env.local` / host env        | `/api/review/submit` (default: `google/gemma-4-31B-it`)                 |
| `INFOMANIAK_AI_BASE_URL`                | `.env.local` / host env        | `/api/agents/*` (optional; derived from endpoint if unset)              |
| `NEXT_PUBLIC_APP_URL`                   | `.env.local` / host env        | Canonical URL in meta tags                                              |
| `INFOMANIAK_AI_TOKEN` (secret)          | Supabase Edge Function secrets | `ai-assistant`, `audio-transcription`, `help-assistant`                   |
| `INFOMANIAK_AI_ENDPOINT` (secret)       | Supabase Edge Function secrets | same functions                                                          |
| `INFOMANIAK_AI_MODEL_PRIMARY` (secret)  | Supabase Edge Function secrets | `ai-assistant` (default in code: `google/gemma-4-31B-it`)             |
| `INFOMANIAK_AI_MODEL_FALLBACK` (secret) | Supabase Edge Function secrets | `ai-assistant` (default: `mistralai/Mistral-Small-4-119B-2603`)         |
| `INFOMANIAK_AI_MODEL_HELP_PRIMARY`      | Supabase Edge Function secrets | `help-assistant` (default: Nemotron Nano)                                 |
| `INFOMANIAK_AI_MODEL_HELP_FALLBACK`     | Supabase Edge Function secrets | `help-assistant` (default: `mistralai/Ministral-3-14B-Instruct-2512`)   |


Note the split: the Next.js API route (`/api/review/submit`) reads AI credentials from host environment variables. The Supabase Edge Functions read them from Supabase secrets. Both need the same token and endpoint set in their respective locations.

---

## Production deploy flow

### 1. Development in Bolt

Active development happens in **Bolt** (bolt.new), a browser-based IDE that runs the Next.js dev server in a WebContainer. Changes are committed directly to the connected GitHub repository.

### 2. GitHub repository

The repository is the single source of truth. There is no CI/CD pipeline configured — deployments are triggered manually. Branches: `main` is production.

### 3. Supabase (database, auth, Edge Functions)

Supabase is managed separately from the application host.

**Schema changes** — Apply migrations via the Supabase MCP tool (`apply_migration`) or the SQL editor in the Supabase dashboard. Migrations live in `supabase/migrations/` and must be applied in filename order (timestamps ensure ordering). Never modify already-applied migrations; always add a new file.

**Edge Functions** — Deployed via the Supabase MCP `deploy_edge_function` tool or the Supabase dashboard. There is no CLI-based deploy in this workflow. After deploying, set or update secrets in the dashboard under Project Settings → Edge Functions → Secrets.

**Auth** — Email/password; **email confirmation** is enforced in Supabase (production). Auth emails (confirm signup, reset password) are sent via the **Send Email Hook** → Edge Function `auth-send-email` → **Resend API** (multilingual en/it/fr/de). Configure the hook in Supabase Dashboard → Authentication → Hooks. Set `AUTH_HOOK_SECRET` on the Edge Function and disable built-in SMTP templates once the hook is verified.

**Transactional email (Resend API)** — All app emails (welcome, publication, admin account, engagement G1/G2) use `lib/server/email/` and `shared/email/`. Required env on **Jelastic** and **Edge Function secrets**:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (e.g. `Biography Library <noreply@biographylibrary.org>`)
- `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_APP_URL` (or `NEXT_PUBLIC_SITE_URL`)
- `CRON_SECRET` (protects `send-engagement-emails` and `user-email-confirmed` webhooks)
- `ENGAGEMENT_EMAILS_ENABLED=true` (optional, default on)
- `PDF_DRAFT_REMINDER_DAYS=7` (optional)

**Edge Functions (email):**

| Function | Purpose |
|----------|---------|
| `auth-send-email` | Supabase Auth Hook → Resend (A1–A2) |
| `user-email-confirmed` | Database webhook on `auth.users` → welcome email (B1) |
| `send-engagement-emails` | Daily cron → chapter available (G1) + PDF draft reminder (G2) |

Schedule engagement job: call `POST /functions/v1/send-engagement-emails` daily with `Authorization: Bearer $CRON_SECRET` (Jelastic cron or Supabase pg_cron).

**Next.js — account lifecycle emails** (suspend / reinstate / delete from `/admin/users`): same `RESEND_*` vars; sends via unified email module.

### 4. Infomaniak Jelastic (Next.js host)

The Next.js application is hosted on an **Infomaniak Jelastic** Node.js container.

To deploy a new version:

1. Pull the latest code from GitHub onto the Jelastic container (SSH or Jelastic Git deployment panel).
2. Run `npm install` and `npm run build` on the container.
3. Restart the Node process (PM2 or the Jelastic process manager).
4. Verify environment variables are set in the Jelastic environment configuration panel — not in any committed file.

The `next.config.js` has `images: { unoptimized: true }` because the Jelastic container does not run the Next.js image optimization server. All biography photos are served directly from Supabase Storage URLs.

The `netlify.toml` file is present from an earlier hosting experiment and is not used in the current Jelastic setup. It can be ignored.

---

## Database migrations

Migrations are plain SQL files in `supabase/migrations/`. The filename prefix is a timestamp (e.g., `20260205184358_`). Apply them in order.

To add a migration:

1. Create a new file: `supabase/migrations/<timestamp>_<description>.sql`
2. Write the SQL. Always use `IF EXISTS` / `IF NOT EXISTS` guards.
3. Enable RLS on any new table: `ALTER TABLE t ENABLE ROW LEVEL SECURITY;`
4. Add policies for every access pattern before shipping.
5. Apply via the Supabase MCP tool or dashboard SQL editor.
6. Commit the file to git.

Never use `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` in a migration without explicit confirmation — the platform stores real user biographical data.

---

## Supabase Edge Functions

Four functions are deployed:


| Slug                  | Purpose                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `ai-assistant`        | All writing AI actions (grammar, prompts, rewrite, follow-up, analysis) |
| `audio-transcription` | Audio blob → transcript via Infomaniak Whisper endpoint                 |
| `help-assistant`      | In-app help chatbot; searches local KB before calling AI                |
| `log-error`           | Receives client-side error reports and writes to `error_logs` table     |


All functions require a valid Supabase JWT in the `Authorization` header (enforced by Supabase). The `log-error` function is the exception — it accepts anon tokens because errors may occur before login.

To update a function: edit `supabase/functions/<slug>/index.ts` and redeploy via the MCP tool.

---

## First-time production setup checklist

Per una **sequenza operativa** (merge → migrazioni prod → env → deploy → smoke test su 5 flussi), usare anche `[docs/BETA_RELEASE_CHECKLIST.md](./docs/BETA_RELEASE_CHECKLIST.md)`.

- Supabase project created; URL and anon key copied to host env vars
- All migrations applied in order
- Edge Functions deployed (ai-assistant, audio-transcription, help-assistant, log-error)
- Edge Function secrets set: `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_ENDPOINT`, model secrets per `DEPLOYMENT.md` (or unset secrets to use code defaults)
- Host environment variables set on Jelastic: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_MODEL` (`google/gemma-4-31B-it`), `NEXT_PUBLIC_APP_URL`
- `npm run build` passes without errors on the container
- First admin user created via Supabase Auth, then role set to `admin` directly in the `profiles` table
- Supabase Storage bucket created for biography media with appropriate public/private access policy

