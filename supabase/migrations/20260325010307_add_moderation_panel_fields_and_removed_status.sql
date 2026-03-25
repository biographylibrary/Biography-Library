/*
  # Moderation Panel: Schema Updates

  ## Summary
  This migration extends the moderation and biography schema to support
  the full moderator detail panel workflow.

  ## Changes

  ### 1. biographies table
  - Adds 'removed' to the status CHECK constraint so staff can mark
    biographies as removed after a moderation decision.

  ### 2. biographies RLS
  - Updates the SELECT policy so non-staff users cannot see biographies
    with status = 'removed'.
  - Staff (reviewer, admin, super_admin) can still see all biographies.

  ### 3. moderation_reports table
  - Adds `assigned_moderator_id` (uuid, nullable FK → profiles) — the
    staff member who took ownership of the report.
  - Adds `assigned_at` (timestamptz, nullable) — when ownership was taken.
  - Adds `moderator_notes` (text, nullable) — internal notes visible only
    to staff, not surfaced to authors.
  - Expands the `decision` CHECK constraint to include the new values:
    'publish', 'publish_warning', 'returned', 'removed' (alongside existing
    values from the original migration).

  ## Security
  - Existing RLS policies on both tables are preserved.
  - Non-staff SELECT on biographies explicitly excludes 'removed' rows.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add 'removed' to biographies.status CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the existing CHECK constraint (named by Postgres) and re-create it
-- with 'removed' included. We use DO block to find & drop any constraint
-- that references the status column.
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc USING (constraint_name)
  WHERE tc.table_name = 'biographies'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%status%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE biographies DROP CONSTRAINT IF EXISTS %I', v_constraint);
  END IF;
END $$;

ALTER TABLE biographies
  ADD CONSTRAINT biographies_status_check
  CHECK (status IN (
    'draft',
    'sections_complete',
    'final_version',
    'under_review',
    'published',
    'removed'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update biographies SELECT RLS: hide 'removed' from non-staff
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Biographies: owner or public access" ON public.biographies;

CREATE POLICY "Biographies: owner or public access"
  ON public.biographies FOR SELECT
  TO authenticated
  USING (
    -- Staff can always see any biography regardless of status
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('reviewer', 'admin', 'super_admin')
    )
    OR (
      -- Non-staff: owner sees their own non-removed biographies
      status != 'removed'
      AND (
        user_id = (SELECT auth.uid())
        OR privacy = 'public'
        OR (privacy = 'public' AND share_token IS NOT NULL)
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Extend moderation_reports: assigned_moderator_id, assigned_at, moderator_notes
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_reports' AND column_name = 'assigned_moderator_id'
  ) THEN
    ALTER TABLE moderation_reports
      ADD COLUMN assigned_moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_reports' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE moderation_reports
      ADD COLUMN assigned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_reports' AND column_name = 'moderator_notes'
  ) THEN
    ALTER TABLE moderation_reports
      ADD COLUMN moderator_notes text;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Expand decision CHECK constraint on moderation_reports
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc USING (constraint_name)
  WHERE tc.table_name = 'moderation_reports'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%decision%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE moderation_reports DROP CONSTRAINT IF EXISTS %I', v_constraint);
  END IF;
END $$;

ALTER TABLE moderation_reports
  ADD CONSTRAINT moderation_reports_decision_check
  CHECK (decision IN (
    'publish',
    'publish_warning',
    'returned',
    'removed',
    'hide',
    'remove',
    'request_edit',
    'no_action'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Index for assigned_moderator_id lookups
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_moderation_reports_assigned_moderator
  ON moderation_reports(assigned_moderator_id)
  WHERE assigned_moderator_id IS NOT NULL;
