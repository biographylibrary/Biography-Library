/*
  # Add optimistic locking fields to biographies

  ## Summary
  Adds two columns to the `biographies` table to support optimistic locking
  during admin review, preventing two reviewers from submitting decisions
  on the same biography concurrently.

  ## Modified Tables

  ### biographies
  - `reviewed_by` (uuid, nullable, FK → profiles(id) SET NULL on delete)
    Set to the reviewing admin's user ID when they open a biography for review.
    Cleared (set to NULL) after a decision is submitted.
  - `reviewed_at` (timestamptz, nullable)
    Timestamp of when the current reviewer claimed the biography.
    Cleared alongside reviewed_by after submission.

  ## How optimistic locking works
  1. When a reviewer opens a biography: UPDATE SET reviewed_by=uid, reviewed_at=now()
  2. Before submitting decision: SELECT reviewed_by to check it still equals uid
  3. On submit: UPDATE ... WHERE reviewed_by=uid (only succeeds if still the owner)
  4. After submit: reviewed_by and reviewed_at are cleared by the update

  ## Notes
  - No RLS changes needed; admin policies already permit updates to biographies
  - SET NULL on delete prevents orphaned references if a reviewer's profile is deleted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE biographies
      ADD COLUMN reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE biographies
      ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;
