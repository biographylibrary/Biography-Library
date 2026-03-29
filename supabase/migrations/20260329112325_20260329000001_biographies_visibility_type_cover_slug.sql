/*
  # Biographies table — 4 schema changes

  ## Summary
  This migration applies four changes to the biographies table:

  ### 1. Rename privacy → visibility and update allowed values
  - Renames the column `privacy` to `visibility`
  - Drops the old CHECK constraint that allowed 'private', 'family', 'public'
  - Migrates existing rows: 'family' becomes 'link-only'
  - Adds new CHECK constraint: 'private' | 'link-only' | 'public'
  - Sets default value to 'private'

  ### 2. Add biography_type column
  - New column `biography_type` TEXT NOT NULL DEFAULT 'autobiography'
  - Allowed values: 'autobiography', 'memorial'
  - All existing rows default to 'autobiography'

  ### 3. Add cover_mode column
  - New column `cover_mode` TEXT NOT NULL DEFAULT 'graphic'
  - Allowed values: 'photo', 'graphic'
  - 'graphic' = brand colour cover, 'photo' = use cover photo from biography_media

  ### 4. Add slug column
  - New nullable UNIQUE column `slug TEXT`
  - Postgres function generate_biography_slug(input_text TEXT) creates URL-safe slugs
  - INSERT trigger auto-populates slug from the biography's title when author_name is present

  ## Security
  - All existing RLS policies that referenced `privacy` are dropped and recreated referencing `visibility`
  - Public read policy updated: status='published' AND visibility IN ('public','link-only')
  - Private biographies (visibility='private') are never exposed by public queries
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- CHANGE 1: Rename privacy → visibility
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE biographies RENAME COLUMN privacy TO visibility;

-- Drop all CHECK constraints on biographies.visibility (the old privacy constraint)
DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid
      AND a.attnum = ANY(c.conkey)
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE cl.relname = 'biographies'
      AND ns.nspname = 'public'
      AND c.contype = 'c'
      AND a.attname = 'visibility'
  LOOP
    EXECUTE format('ALTER TABLE biographies DROP CONSTRAINT IF EXISTS %I', con_name);
  END LOOP;
END $$;

-- Migrate 'family' rows to 'link-only'
UPDATE biographies SET visibility = 'link-only' WHERE visibility = 'family';

-- Add new CHECK constraint
ALTER TABLE biographies
  ADD CONSTRAINT biographies_visibility_check
  CHECK (visibility IN ('private', 'link-only', 'public'));

-- Set default
ALTER TABLE biographies
  ALTER COLUMN visibility SET DEFAULT 'private';

-- ─────────────────────────────────────────────────────────────────────────────
-- CHANGE 2: Add biography_type
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE biographies
  ADD COLUMN IF NOT EXISTS biography_type TEXT
  NOT NULL DEFAULT 'autobiography'
  CHECK (biography_type IN ('autobiography', 'memorial'));

-- ─────────────────────────────────────────────────────────────────────────────
-- CHANGE 3: Add cover_mode
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE biographies
  ADD COLUMN IF NOT EXISTS cover_mode TEXT
  NOT NULL DEFAULT 'graphic'
  CHECK (cover_mode IN ('photo', 'graphic'));

-- ─────────────────────────────────────────────────────────────────────────────
-- CHANGE 4: Add slug with generation function and trigger
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE biographies
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Unique index on slug (allows NULLs — UNIQUE constraints in Postgres allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS biographies_slug_unique_idx
  ON biographies (slug)
  WHERE slug IS NOT NULL;

-- Slug generation function
CREATE OR REPLACE FUNCTION generate_biography_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 2;
BEGIN
  -- Lowercase
  base_slug := lower(input_text);

  -- Replace accented / special Latin characters with ASCII equivalents
  base_slug := translate(base_slug,
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñçßæœ',
    'aaaaaaeeeeiiiioooooouuuuyynsaaeo'
  );
  base_slug := replace(base_slug, 'ß', 'ss');
  base_slug := replace(base_slug, 'æ',  'ae');
  base_slug := replace(base_slug, 'œ',  'oe');

  -- Replace non-alphanumeric with hyphen
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');

  -- Collapse multiple hyphens
  base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');

  -- Trim leading/trailing hyphens
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');

  -- If the slug is empty after sanitization, use a fallback
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'biography';
  END IF;

  candidate := base_slug;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM biographies WHERE slug = candidate) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Trigger function that sets slug on INSERT if not already provided
CREATE OR REPLACE FUNCTION set_biography_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL AND NEW.title IS NOT NULL AND NEW.title != '' THEN
    NEW.slug := generate_biography_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS trg_set_biography_slug ON biographies;

CREATE TRIGGER trg_set_biography_slug
  BEFORE INSERT ON biographies
  FOR EACH ROW
  EXECUTE FUNCTION set_biography_slug();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — Drop and recreate all policies that referenced the old privacy column
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old consolidated SELECT policy (created in migration 20260325010307)
DROP POLICY IF EXISTS "Biographies: owner or public access" ON biographies;

-- Also drop older variants that may still exist from earlier migrations
DROP POLICY IF EXISTS "Authenticated users can view public biographies" ON biographies;
DROP POLICY IF EXISTS "Public biographies accessible via share token" ON biographies;

-- Recreate the consolidated SELECT policy using visibility
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
        OR visibility IN ('public', 'link-only')
      )
    )
  );

-- Anon / unauthenticated SELECT policy (for public share links)
DROP POLICY IF EXISTS "Anyone can view public biographies" ON biographies;
DROP POLICY IF EXISTS "Public read for published biographies" ON biographies;

CREATE POLICY "Public read for published biographies"
  ON public.biographies FOR SELECT
  TO anon
  USING (
    status = 'published'
    AND visibility IN ('public', 'link-only')
  );
