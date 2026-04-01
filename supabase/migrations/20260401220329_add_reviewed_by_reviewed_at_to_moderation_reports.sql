/*
  # Add optimistic locking fields to moderation_reports

  ## Summary
  Adds reviewed_by and reviewed_at columns to the moderation_reports table to
  support concurrency control in the admin review panel. This prevents two
  reviewers from simultaneously working on the same report and silently
  overwriting each other's decision.

  ## Modified Tables

  ### moderation_reports
  - `reviewed_by` (uuid, nullable, FK → profiles(id) SET NULL on delete)
    Written to when a reviewer opens a report. If already set to another user,
    the UI shows a warning banner so reviewers know the report is being worked on.
    Cleared to NULL after a decision is submitted.
  - `reviewed_at` (timestamptz, nullable)
    Timestamp when the current reviewer claimed the report.
    Cleared alongside reviewed_by after submission.

  ## How optimistic locking works
  1. Reviewer opens panel → try to claim: UPDATE SET reviewed_by=uid, reviewed_at=now()
     WHERE id=reportId AND (reviewed_by IS NULL OR reviewed_by=uid)
  2. If 0 rows affected, another reviewer has it → fetch their name and show banner.
  3. On submit decision → UPDATE ... WHERE id=reportId AND reviewed_by=uid
     If 0 rows updated, a conflict occurred → show error and abort.
  4. After successful decision, reviewed_by and reviewed_at are cleared.

  ## Security
  - No new RLS policies needed; existing admin/staff UPDATE policies on
    moderation_reports already permit these column writes.
  - SET NULL on delete prevents orphaned references if a reviewer's profile
    is deleted while they hold a claim.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_reports' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE moderation_reports
      ADD COLUMN reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_reports' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE moderation_reports
      ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;
