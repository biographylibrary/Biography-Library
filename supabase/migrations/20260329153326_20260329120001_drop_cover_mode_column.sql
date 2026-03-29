/*
  # Drop cover_mode column from biographies

  ## Summary
  Removes the `cover_mode` column from the `biographies` table.

  ## Changes
  - **Modified table:** `biographies`
    - Drops column `cover_mode` (TEXT, values 'photo' | 'graphic')

  ## Reason
  The cover_mode concept has been removed. All biographies now use
  a photo cover exclusively. The column is no longer referenced in
  application code.
*/

ALTER TABLE biographies DROP COLUMN IF EXISTS cover_mode;
