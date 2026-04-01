/*
  # Canonicalise biography status CHECK constraint

  ## Summary
  Ensures the `biographies_status_check` constraint exactly matches the
  TypeScript type and removes the legacy `'completed'` value that was
  superseded by `'sections_complete'` in migration
  20260316212943_fix_biography_status_constraint.sql but was never formally
  dropped from the constraint definition in that file.

  The live constraint already contains the correct set (applied by later
  migrations). This migration is idempotent: it drops and recreates the
  constraint to guarantee the canonical list is recorded explicitly.

  ## Valid status values after this migration
  - draft            — biography in progress
  - sections_complete — all sections marked done (replaces legacy 'completed')
  - final_version    — author has produced a final prose version
  - under_review     — submitted; awaiting moderator decision
  - published        — approved and publicly visible
  - removed          — taken down by moderation

  ## Changes
  - DROP CONSTRAINT biographies_status_check (if exists)
  - ADD CONSTRAINT biographies_status_check with the six canonical values

  ## Security
  No RLS change. Constraint tightening only.
*/

ALTER TABLE biographies DROP CONSTRAINT IF EXISTS biographies_status_check;

ALTER TABLE biographies
  ADD CONSTRAINT biographies_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'sections_complete'::text,
    'final_version'::text,
    'under_review'::text,
    'published'::text,
    'removed'::text
  ]));
