# Contributing

## Branches

| Prefix | Use |
|---|---|
| `feat/` | New feature or screen |
| `fix/` | Bug fix |
| `db/` | Supabase migration or RLS change |
| `chore/` | Dependency update, config, tooling |
| `docs/` | Documentation only |

Branch off `main`. Keep branches short-lived. One logical change per branch.

## Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org/) style:

```
<type>(<scope>): <short imperative summary>

[optional body — explain why, not what]
```

Common types: `feat`, `fix`, `db`, `refactor`, `chore`, `docs`, `test`.

Good examples:
```
feat(editor): add voice recorder to section toolbar
fix(rls): prevent anon token leaking section content for private bios
db(migrations): add reviewed_by and reviewed_at columns to biographies
```

- Subject line: 72 chars max, lowercase, no trailing period.
- If a commit touches a migration file, prefix with `db:` regardless of other changes.
- Never commit `.env.local` or any file containing secrets.

## Pull Requests

- Target branch: `main`.
- Title mirrors the commit style: `fix(auth): redirect loop on password reset`.
- Description must include:
  - What changed and why.
  - If a Supabase migration is included: what tables/columns are affected and whether RLS was updated.
  - Testing steps (manual is fine; describe the scenario you verified).
- Link any related issue or Notion card in the description.
- Mark as Draft until ready for review.

## Code review expectations

- At least one approval before merging.
- Reviewer checks: correctness, RLS completeness on any schema change, no secrets committed, `npm run build` passes.
- Author resolves all comments before merging; use "Resolve" only after the concern is addressed.
- Prefer "Request changes" over inline nits — leave nitpicks as suggestions, not blockers.
- Squash-merge into `main` to keep history readable.

## Before opening a PR

```bash
npm run typecheck   # zero type errors
npm run lint        # zero lint errors
npm run build       # build must succeed
```

If the PR includes a migration, verify:
- The SQL file is in `supabase/migrations/` with a fresh timestamp prefix.
- RLS is enabled and policies cover all access patterns.
- No `DROP TABLE` / `TRUNCATE` without explicit discussion.
