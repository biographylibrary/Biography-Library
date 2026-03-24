/*
  # Add role column to profiles

  1. Changes
    - `profiles` table: new column `role` (text, NOT NULL, default 'user')
    - CHECK constraint limiting values to: 'user', 'reviewer', 'admin', 'super_admin'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN role text NOT NULL DEFAULT 'user'
      CONSTRAINT profiles_role_check CHECK (role IN ('user', 'reviewer', 'admin', 'super_admin'));
  END IF;
END $$;
