/*
  # Enforce NOT NULL on biography_sections.section_key

  ## Summary
  Adds a NOT NULL constraint to the section_key column on biography_sections.
  section_key is the canonical identifier used throughout the application for
  all section lookups, AI prompts, and revision history. The nullable status
  was an oversight since every write path already supplies a value.

  ## Pre-flight check
  A COUNT(*) WHERE section_key IS NULL was run before this migration and
  returned 0 rows, confirming it is safe to add the constraint immediately
  without a backfill step.

  ## Modified Tables

  ### biography_sections
  - `section_key` — changed from nullable text to NOT NULL text

  ## Notes
  - No data is altered; constraint is metadata-only.
  - No RLS changes required.
*/

ALTER TABLE biography_sections
  ALTER COLUMN section_key SET NOT NULL;
