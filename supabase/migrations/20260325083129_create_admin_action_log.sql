/*
  # Create admin_action_log table

  ## Summary
  Creates a dedicated log table for admin and staff actions performed on
  biographies and users. Replaces the need to repurpose role_change_log.

  ## New Tables
  - `admin_action_log`
    - `id` (uuid, PK) — unique log entry
    - `performed_by` (uuid, FK → profiles.id) — staff member who took action
    - `action_type` (text) — e.g. 'force_publish', 'set_draft', 'remove', 'restore'
    - `target_type` (text) — 'biography' or 'user'
    - `target_id` (uuid) — ID of the affected biography or user
    - `details` (jsonb) — optional extra context (old status, new status, etc.)
    - `created_at` (timestamptz) — timestamp of the action

  ## Security
  - RLS enabled
  - Staff (reviewer, admin, super_admin) can SELECT
  - Staff can INSERT (only their own performed_by)
  - No UPDATE or DELETE allowed
*/

CREATE TABLE IF NOT EXISTS admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_action_log_performed_by_idx ON admin_action_log(performed_by);
CREATE INDEX IF NOT EXISTS admin_action_log_target_id_idx ON admin_action_log(target_id);
CREATE INDEX IF NOT EXISTS admin_action_log_created_at_idx ON admin_action_log(created_at DESC);

ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read action log"
  ON admin_action_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('reviewer', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Staff can insert own actions"
  ON admin_action_log FOR INSERT
  TO authenticated
  WITH CHECK (
    performed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('reviewer', 'admin', 'super_admin')
    )
  );
