/*
  # Final PDF + listing cover URLs

  - `final_pdf_url` — public URL of the definitive book PDF (no watermark) after approve-final.
  - `listing_cover_url` — optional raster of PDF page 1 for catalogue cards (filled when a renderer is available).

  Files live in the existing public `biography-exports` bucket.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'final_pdf_url'
  ) THEN
    ALTER TABLE biographies ADD COLUMN final_pdf_url text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'listing_cover_url'
  ) THEN
    ALTER TABLE biographies ADD COLUMN listing_cover_url text DEFAULT NULL;
  END IF;
END $$;
