/*
  # Create role_change_log table

  ## Purpose
  Audit log for all user role changes made by super_admins.

  ## New Tables
  - `role_change_log`
    - `id` (uuid, PK)
    - `changed_by` (uuid, FK → profiles) — the super_admin who made the change
    - `target_user` (uuid, FK → profiles) — the user whose role was changed
    - `old_role` (text) — role before the change
    - `new_role` (text) — role after the change
    - `changed_at` (timestamptz) — when the change occurred

  ## Security
  - RLS enabled; only users with role = 'super_admin' can read or insert.
  - super_admin SELECT: uses get_my_role() to avoid RLS recursion.
  - super_admin INSERT: uses get_my_role() to avoid RLS recursion.
*/

CREATE TABLE IF NOT EXISTS public.role_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_role text NOT NULL,
  new_role text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_change_log_changed_by ON public.role_change_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_role_change_log_target_user ON public.role_change_log(target_user);
CREATE INDEX IF NOT EXISTS idx_role_change_log_changed_at ON public.role_change_log(changed_at DESC);

ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read role change log"
  ON public.role_change_log FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admins can insert role change log"
  ON public.role_change_log FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'super_admin');
