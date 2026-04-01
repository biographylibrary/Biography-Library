/*
  # Drop is_locked column from biographies

  ## Summary
  Removes the `is_locked` boolean column that was added in migration
  20260208172359_add_publication_workflow.sql. The column is redundant
  because `is_frozen` (added later by admin tooling) serves as the single
  authoritative freeze flag and is enforced by RLS policy
  `add_frozen_update_block_policy`. Application code already derives the
  "effectively locked" state from `is_frozen`; `is_locked` was only set
  on the client side during the old direct-publish flow which no longer
  exists.

  ## Changes
  - `biographies.is_locked` (boolean, DEFAULT false) — DROPPED

  ## Security
  No RLS policy references `is_locked`; no change required.
  The existing `is_frozen` update-block policy remains the sole freeze
  enforcement mechanism.
*/

ALTER TABLE biographies DROP COLUMN IF EXISTS is_locked;
