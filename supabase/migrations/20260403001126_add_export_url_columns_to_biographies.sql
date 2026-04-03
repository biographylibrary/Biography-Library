/*
  # Add export URL columns to biographies

  ## Summary
  Adds two nullable text columns to the biographies table to store
  auto-generated export file URLs that are created when a biography is
  submitted for review.

  ## New Columns (biographies table)
  - `export_txt_url` (text, nullable) — Public or signed URL of the
    auto-generated plain text (.txt) export stored in Supabase Storage.
  - `export_docx_url` (text, nullable) — Public or signed URL of the
    auto-generated Word document (.docx) export stored in Supabase Storage.

  ## Notes
  1. Both columns are nullable. A null value means no export has been
     generated yet (e.g. biography has never been submitted for review).
  2. Values are overwritten on every re-submission, pointing to the
     latest version of each file.
  3. No RLS changes needed — existing biography policies already cover
     reading/writing these columns for authenticated owners.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'export_txt_url'
  ) THEN
    ALTER TABLE biographies ADD COLUMN export_txt_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'export_docx_url'
  ) THEN
    ALTER TABLE biographies ADD COLUMN export_docx_url TEXT;
  END IF;
END $$;
