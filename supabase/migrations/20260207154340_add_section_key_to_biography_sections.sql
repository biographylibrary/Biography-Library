/*
  # Add section_key column to biography_sections

  1. Changes
    - Add `section_key` column (TEXT) to biography_sections table
    - This column identifies the type of section (e.g., 'childhood', 'education', 'career')
    - Add index for faster lookups by biography_id + section_key combination
    - Add unique constraint to ensure one section_key per biography

  2. Notes
    - Existing rows will have NULL section_key initially
    - Application code should populate this field
*/

DO $$
BEGIN
  -- Add section_key column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biography_sections' AND column_name = 'section_key'
  ) THEN
    ALTER TABLE biography_sections
    ADD COLUMN section_key TEXT;
  END IF;
END $$;

-- Create index on biography_id + section_key for faster queries
CREATE INDEX IF NOT EXISTS idx_biography_sections_biography_section
ON biography_sections(biography_id, section_key);

-- Add unique constraint to ensure one section_key per biography
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'biography_sections_biography_id_section_key_key'
  ) THEN
    ALTER TABLE biography_sections
    ADD CONSTRAINT biography_sections_biography_id_section_key_key
    UNIQUE (biography_id, section_key);
  END IF;
END $$;