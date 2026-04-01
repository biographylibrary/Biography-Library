/*
  # Enforce NOT NULL on biography_sections.section_key

  ## Summary
  Pre-flight check confirmed zero rows with NULL section_key, so it is safe
  to add the NOT NULL constraint.

  ## Changes
  - `biography_sections` table
    - `section_key` column: add NOT NULL constraint

  ## Notes
  1. No data migration required — all existing rows already have a section_key value.
  2. The column already has an index and is used as the primary lookup key throughout
     the application; this constraint formalises the invariant that was already assumed.
*/

ALTER TABLE biography_sections
  ALTER COLUMN section_key SET NOT NULL;
