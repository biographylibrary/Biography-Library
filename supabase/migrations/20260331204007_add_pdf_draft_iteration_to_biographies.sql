/*
  # Add pdf_draft_iteration column to biographies

  ## Summary
  Adds a nullable integer column `pdf_draft_iteration` to the biographies table
  to track how many draft PDFs have been generated for a biography before final
  publication review.

  ## Changes

  ### Modified Tables
  - `biographies`
    - New column: `pdf_draft_iteration` (integer, nullable, default null)
      - null  = no draft PDF generated yet
      - 1     = First Draft
      - 2     = Second Draft
      - 3     = Third Draft (final allowed before review submission)

  ## Notes
  - No RLS changes required — this column is part of the existing biographies table
    which already has appropriate RLS policies.
  - Column is nullable and defaults to null so no existing rows are affected.
  - No check constraint is added here; the application enforces the 1–3 limit.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'pdf_draft_iteration'
  ) THEN
    ALTER TABLE biographies ADD COLUMN pdf_draft_iteration integer DEFAULT NULL;
  END IF;
END $$;
