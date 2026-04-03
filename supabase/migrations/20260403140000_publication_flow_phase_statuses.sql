/*
  # Publication flow — phase statuses and audit timestamps

  ## Summary
  Extends `biographies.status` with two values for the target flow (ARCHITECTURE §6a):
  - `pdf_draft` — author in watermarked PDF draft rounds (uses `pdf_draft_iteration` 1–3)
  - `locked_pending_screening` — final PDF approved, text locked, collateral generated; AI screening next

  Adds optional timestamps for auditing transitions into those phases.

  ## Valid status values after this migration
  - draft
  - sections_complete
  - final_version
  - pdf_draft
  - locked_pending_screening
  - under_review
  - published
  - removed

  ## Security
  No RLS change — same table, broader CHECK only.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'pdf_draft_started_at'
  ) THEN
    ALTER TABLE biographies ADD COLUMN pdf_draft_started_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'final_pdf_approved_at'
  ) THEN
    ALTER TABLE biographies ADD COLUMN final_pdf_approved_at timestamptz DEFAULT NULL;
  END IF;
END $$;

ALTER TABLE biographies DROP CONSTRAINT IF EXISTS biographies_status_check;

ALTER TABLE biographies
  ADD CONSTRAINT biographies_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'sections_complete'::text,
    'final_version'::text,
    'pdf_draft'::text,
    'locked_pending_screening'::text,
    'under_review'::text,
    'published'::text,
    'removed'::text
  ]));
