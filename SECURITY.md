# Security

## Reporting a vulnerability

Do not open a public GitHub issue for security bugs.

Send a private email describing the issue, steps to reproduce, and potential impact. Include "SECURITY" in the subject line. You will receive an acknowledgement within 48 hours and a resolution timeline within 5 business days.

---

## Threat model

This application stores biographical data — personal life stories, photos, and notes. The primary risks are:

| Threat | Mitigation |
|---|---|
| User reads another user's biography content | Supabase RLS: all biography/section queries check `auth.uid() = user_id` |
| Anon visitor accesses private biography via share token | Share-token path uses a signed RPC (`get_biography_by_share_token`); `link_only` visibility excluded from general anon SELECT |
| Privilege escalation (user → admin/reviewer) | Role stored in `profiles.role`; only `super_admin` may change it; role changes are logged in `role_change_log` |
| AI endpoint abuse / prompt injection | Per-user rate limits enforced in the Edge Function (5/min, 40/day, 200/week); content passed to AI is user-owned text only |
| Mass scraping of published biographies | `increment_view_count` RPC exists; no current rate-limit on public reads — treat published content as public |
| Service-role key exposure | Key is never exposed to the client; used only inside Edge Functions and server-side API routes |
| Frozen/moderated biography edits | `is_frozen = true` blocks UPDATE via RLS policy (`add_frozen_update_block_policy` migration) |
| Admin action accountability | All admin actions (freeze, role change, moderation decisions) are written to `admin_action_log` |

---

## Row Level Security basics

Every table has RLS enabled. The general pattern:

- **SELECT** — `auth.uid() = user_id` (or membership check for shared resources).
- **INSERT** — `WITH CHECK (auth.uid() = user_id)`.
- **UPDATE / DELETE** — both `USING` and `WITH CHECK` where appropriate.
- Policies never use `USING (true)` for authenticated data.
- Anonymous access is limited to: public/published biographies and the `moderation_reports` INSERT policy (reports can be filed without login).

The `profiles` table uses a `SECURITY DEFINER` helper function to avoid RLS recursion when checking roles. Do not query `profiles` directly inside RLS policies — use the helper.

---

## What is NOT in scope for the current threat model

- DDoS / volumetric attacks (handled at infrastructure level by Infomaniak).
- Supabase platform security (Supabase's responsibility).
- Client-side XSS via Tiptap content — content is rendered inside the editor only; exported PDFs/DOCX are generated server-side from sanitised content.

---

## Adding new tables or endpoints

Before shipping any new table or API route:

1. Enable RLS immediately: `ALTER TABLE t ENABLE ROW LEVEL SECURITY;`
2. Write the minimum necessary policies — no catch-all `USING (true)`.
3. If the route calls the Infomaniak AI API, ensure it goes through the `ai-assistant` Edge Function (which enforces rate limits) rather than calling the API directly from client code.
4. Never log request bodies that may contain biography text or auth tokens.
