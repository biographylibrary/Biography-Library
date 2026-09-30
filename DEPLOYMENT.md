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
#   audio-transcription, log-error
# Then set Edge Function secrets in the Supabase dashboard:
#   INFOMANIAK_AI_TOKEN, INFOMANIAK_AI_ENDPOINT (audio-transcription)
# (the grammar check now runs in Next.js: INFOMANIAK_AI_MODEL_* and AI_*_LIMIT
#  are read from the app's .env, not from Supabase secrets)

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

`.env.example` is the single documented list of every variable the project reads. It is not a summary: `npm run check:env` compares it against the code and CI fails if the two diverge, so nothing is listed twice and nothing drifts.

**When you add, rename or remove a key, write it in all the places that need it:**

| # | Where | What it is |
| - | ----- | ---------- |
| 1 | `.env.local` | Your machine. Never committed. |
| 2 | `.env.example` | The documented list. Comment the key out if it is optional; a commented key still counts as documented. |
| 3 | `/opt/bl-app/.env` on Jelastic | Production. Set over SSH by hand, then redeploy. A `NEXT_PUBLIC_*` key needs a rebuild, not just a restart: Next.js inlines it at `next build` time, so `docker run --env-file` is too late for it. |
| 4 | Supabase Edge Function secrets | Only for keys read by `supabase/functions/*` (Project Settings → Edge Functions → Secrets). |
| 5 | `.github/workflows/ci.yml` | Only `NEXT_PUBLIC_*` keys the build needs, with placeholder values. |
| 6 | `Dockerfile` and `deploy.yml` | **`NEXT_PUBLIC_*` only**, as `ARG` plus `ENV` in the Dockerfile and as `--build-arg` in the deploy. `.dockerignore` keeps `.env` out of the build context, so a public key that does not pass through here ends up empty in the bundle, silently. `npm run check:env` checks this too. |
| 7 | GitHub Actions secrets in `.github/workflows/deploy.yml` | `JELASTIC_HOST`, `JELASTIC_USER`, `JELASTIC_SSH_KEY`, `JELASTIC_PORT`. SSH for deploy only. Not app env: **do not** list them in `.env.example`. |

Steps 1, 2 and 5 are checked automatically. Step 6 (`NEXT_PUBLIC_*` in Dockerfile/deploy) is checked by `check:env`. Steps 3 and 4 are manual and silent when forgotten: a missing key there does not crash the app, it disables a feature. Step 7 is not an app variable. Run `npm run check:env` after any change to see the current list.

Note the split: the Next.js API route (`/api/review/submit`) reads AI credentials from host environment variables. The Supabase Edge Functions read them from Supabase secrets. Both need the same token and endpoint set in their respective locations.

---

## Production deploy flow

### 1. Development in Bolt

Active development happens in **Bolt** (bolt.new), a browser-based IDE that runs the Next.js dev server in a WebContainer. Changes are committed directly to the connected GitHub repository.

### 2. GitHub repository

The repository is the single source of truth. Branches: `main` is production. Two workflows run from it: `.github/workflows/ci.yml` on every pull request (env check, typecheck, lint, build) and `.github/workflows/deploy.yml` on every push to `main`, which deploys to Jelastic over SSH.

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

1. Merge to `main` — GitHub Actions SSH deploy runs automatically (see `.github/workflows/deploy.yml`).
2. Or manually on the node: `cd /opt/bl-app`, `git pull`, `docker build` + `docker run` as in the workflow.
3. Verify env vars in `/opt/bl-app/.env` (also passed as `--env-file` to the container).
4. After deploy, check disk: `docker system df` (see Docker disk maintenance below).

The `next.config.js` has `images: { unoptimized: true }` because the Jelastic container does not run the Next.js image optimization server. All biography photos are served directly from Supabase Storage URLs.

The `netlify.toml` file is present from an earlier hosting experiment and is not used in the current Jelastic setup. It can be ignored.

#### Docker disk maintenance

Every merge to `main` triggers `docker build` on the Jelastic node via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Without periodic cleanup, **BuildKit cache** can grow to tens of GB (roughly 1 GB of layers per deploy).

**Automatic (after each deploy):** the workflow runs `docker builder prune` and `docker image prune` to cap cache growth.

**Manual check (SSH on the node):**

```bash
docker system df
```

**If Build Cache exceeds ~10 GB or Jelastic reports disk usage above 80%:**

```bash
docker builder prune -af
docker system df
```

This is safe while `bl-app` is running — it does not remove the active container or its current image.

**Typical footprint after cleanup:** one production image (~500 MB with standalone `Dockerfile`, or ~3 GB with a full `node_modules` image) and Build Cache near 0–2 GB.

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

Never use `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` in a migration without explicit confirmation, the platform stores real user biographical data.

**Release of block 1 (AI tools and security).** Seven new migrations. Apply them only after explicit confirmation, with `apply_migration` (one call per file, in this order). The order of the file names is the order of application, so a database rebuilt from the files gets the same sequence. **Migration history caveat:** `apply_migration` takes only a name and registers as `version` the timestamp of the moment it runs, not the prefix of the file (in production's history, 24 of the 91 entries that have a same-named file carry a different version, and 11 migrations of 21-25 September 2026 have no entry at all). Whether to align the seven new rows with the file versions is decided before applying. The new code works both before and after the restrictive migrations (it writes server-only columns with the service role); the old code does not work after them, and the new code cannot publish without `publication_records`.

| # | Migration | When | What it does | Why there |
|---|---|---|---|---|
| 1 | `20260930115700_publication_records.sql` | **before the deploy** | adds the fingerprint log (service role only) | new table, the old code ignores it; the new code needs it to publish |
| 2 | `20260930115800_ai_token_usage.sql` | **before the deploy** | adds the usage ledger, the caps and their seed values | new tables and function; the new code writes to it, `audio-transcription` too |
| | *merge to `main` (deploy)* | | | |
| 3 | `20260930115900_align_biographies_profiles_triggers.sql` | **after the deploy** | recreates, identical, the triggers and functions production already has | no change in production (the dry run checks it byte for byte); it sits here because the next one relies on it |
| 4 | `20260930120000_server_only_columns_and_reports.sql` | **after the deploy** | restricts: server-only columns on `biographies` and `profiles`; drops three direct INSERT policies | the old code writes those columns from the browser and would break |
| 5 | `20260930120100_drop_biography_view_translations.sql` | **after the deploy** | deletes the reader-translation cache table (18 derived rows) | the old code still reads it; the new code does not |
| 6 | `20260930120150_author_text_whitelist.sql` | **after the deploy** | restricts: text writable only in the closed list of states, on `biographies` and five child tables | the new editor already respects it; the old one does not |
| 7 | `20260930120200_agent_threads_echo_only.sql` | **after the deploy** | deletes non-Echo threads (none in production) and restricts `agent_type` to `echo` | the old code can create other types |

Before applying anything: the dry run, `node scripts/build-dry-run.mjs`, a single `DO` block that applies the seven migrations in this order, compares the catalogue, tries the forbidden writes as `authenticated` on existing biographies and always ends with an exception that cancels everything (no INSERT, so no sequence is consumed). It is rehearsed on the local bench (`lib/server/__tests__/db/dry-run.test.ts`). Run it in production only at an agreed time: it holds locks on `biographies`, `profiles` and `moderation_reports` for the duration of the block (well under a second of work; `lock_timeout` 3 s cancels it if it cannot get them).

After the last migration: test account up to the PDF draft, stopping before publication (no UM identifier), then by hand in the Supabase dashboard: delete `ai-assistant` and `help-assistant`, unset `INFOMANIAK_AI_MODEL`, `INFOMANIAK_AI_MODEL_HELP_PRIMARY`, `INFOMANIAK_AI_MODEL_HELP_FALLBACK`; then redeploy `audio-transcription` and check that Echo, the grammar check and the voice answer and leave rows in `ai_token_usage`. Rollback of migrations 4 and 6: `supabase/rollback/20260930_security_rollback.sql` (never applied automatically). Full checklist: `docs/BETA_RELEASE_CHECKLIST.md`.

---

## Supabase Edge Functions

Two functions are deployed for AI transcription and error reporting. The `ai-assistant` function (and the undocumented `help-assistant`, version 29, whose deployed source is kept in `docs/legacy/help-assistant/`) were removed from the repository on 30 September 2026 and must be deleted from the Supabase project by hand after the release of block 1 (tools available to the agent cannot delete functions). The grammar check is `POST /api/biography/[id]/grammar`:


| Slug                  | Purpose                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `audio-transcription` | Audio blob → transcript via Infomaniak Whisper endpoint                 |
| `log-error`           | Receives client-side error reports and writes to `error_logs` table     |


All functions require a valid Supabase JWT in the `Authorization` header (enforced by Supabase). The `log-error` function is the exception — it accepts anon tokens because errors may occur before login.

To update a function: edit `supabase/functions/<slug>/index.ts` and redeploy via the MCP tool.

---

## First-time production setup checklist

Per una **sequenza operativa** (merge → migrazioni prod → env → deploy → smoke test su 5 flussi), usare anche `[docs/BETA_RELEASE_CHECKLIST.md](./docs/BETA_RELEASE_CHECKLIST.md)`.

- Supabase project created; URL and anon key copied to host env vars
- All migrations applied in order
- Edge Functions deployed (audio-transcription, log-error)
- Edge Function secrets set: `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_ENDPOINT`, model secrets per `DEPLOYMENT.md` (or unset secrets to use code defaults)
- Host environment variables set on Jelastic: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `AGENT_MODEL_*` / `INFOMANIAK_AI_MODEL_PRIMARY` as in `.env.example` (there is no `INFOMANIAK_AI_MODEL`), `UM_ID_BASE_URL`, `NEXT_PUBLIC_APP_URL`
- `npm run build` passes without errors on the container
- First admin user created via Supabase Auth, then role set to `admin` directly in the `profiles` table
- Supabase Storage bucket created for biography media with appropriate public/private access policy

