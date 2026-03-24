/*
  # Add view_count and featured fields to biographies

  ## Summary
  Adds four new columns to the biographies table to support view tracking
  and editorial featuring of biographies.

  ## New Columns
  - `view_count` (integer, NOT NULL, default 0) — running count of public views
  - `is_featured` (boolean, NOT NULL, default false) — whether the biography is editorially featured
  - `featured_at` (timestamptz, nullable) — timestamp when the biography was featured
  - `featured_by` (uuid, nullable, FK → profiles.id ON DELETE SET NULL) — admin/reviewer who featured it

  ## Notes
  - No existing rows are affected; defaults ensure backward compatibility.
  - The FK on featured_by uses ON DELETE SET NULL so deleting a profile does not cascade-delete biography records.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE biographies ADD COLUMN view_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE biographies ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'featured_at'
  ) THEN
    ALTER TABLE biographies ADD COLUMN featured_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'featured_by'
  ) THEN
    ALTER TABLE biographies ADD COLUMN featured_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
