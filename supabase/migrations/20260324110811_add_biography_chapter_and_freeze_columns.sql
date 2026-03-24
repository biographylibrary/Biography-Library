/*
  # Add chapter scheduling and freeze columns to biographies

  ## Summary
  Adds six new columns to the biographies table to support chapter-based publishing,
  biography freeze functionality, and cross-linking between biographies.
  Also adds a trigger to auto-compute next_chapter_available_at.

  ## Changes to biographies

  ### New Columns
  - `frozen_at` (timestamptz, nullable) — timestamp when the biography was frozen
  - `frozen_reason` (text, nullable) — reason for freeze: 'death' or 'admin_action'
  - `last_chapter_published_at` (timestamptz, nullable) — when the most recent chapter was published
  - `next_chapter_available_at` (timestamptz, nullable) — auto-set to last_chapter_published_at + 365 days
  - `chapters_count` (integer, NOT NULL, default 0) — running count of published chapters
  - `linked_biography_ids` (jsonb, default '[]') — array of related biography IDs

  ## Trigger
  - After UPDATE on biographies, if last_chapter_published_at changes to a non-null value,
    next_chapter_available_at is automatically set to last_chapter_published_at + INTERVAL '365 days'

  ## FK Verification
  - All 8 FK references to biographies(id) already use ON DELETE CASCADE — no changes needed
*/

-- Add frozen_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'frozen_at'
  ) THEN
    ALTER TABLE biographies ADD COLUMN frozen_at timestamptz;
  END IF;
END $$;

-- Add frozen_reason
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'frozen_reason'
  ) THEN
    ALTER TABLE biographies
      ADD COLUMN frozen_reason text
      CHECK (frozen_reason IN ('death', 'admin_action'));
  END IF;
END $$;

-- Add last_chapter_published_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'last_chapter_published_at'
  ) THEN
    ALTER TABLE biographies ADD COLUMN last_chapter_published_at timestamptz;
  END IF;
END $$;

-- Add next_chapter_available_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'next_chapter_available_at'
  ) THEN
    ALTER TABLE biographies ADD COLUMN next_chapter_available_at timestamptz;
  END IF;
END $$;

-- Add chapters_count
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'chapters_count'
  ) THEN
    ALTER TABLE biographies ADD COLUMN chapters_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add linked_biography_ids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biographies' AND column_name = 'linked_biography_ids'
  ) THEN
    ALTER TABLE biographies ADD COLUMN linked_biography_ids jsonb NOT NULL DEFAULT '[]';
  END IF;
END $$;

-- Trigger function: auto-set next_chapter_available_at when last_chapter_published_at is updated
CREATE OR REPLACE FUNCTION set_next_chapter_available_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_chapter_published_at IS NOT NULL
     AND (OLD.last_chapter_published_at IS DISTINCT FROM NEW.last_chapter_published_at)
  THEN
    NEW.next_chapter_available_at := NEW.last_chapter_published_at + INTERVAL '365 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_next_chapter_available_at ON biographies;

CREATE TRIGGER trg_set_next_chapter_available_at
  BEFORE UPDATE ON biographies
  FOR EACH ROW
  EXECUTE FUNCTION set_next_chapter_available_at();
