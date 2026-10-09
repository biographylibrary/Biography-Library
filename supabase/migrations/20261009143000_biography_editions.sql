/*
  # Edizioni (traduzioni dell'autore)

  Additiva. Non elimina content_language: il CHECK a quattro lingue si toglie,
  la colonna resta finché la funzione send-engagement-emails e il codice che
  la legge non sono in produzione. L'eliminazione è
  20261009150000_drop_content_language_after_release.sql, da applicare dopo.

  translation_of è riservata al server. Un'edizione punta a un originale
  (niente catene), stesso user_id, e non consuma il numero del badge Pioniere
  né il capitolo annuale. La lettura pubblica di un'edizione richiede che
  anche l'originale sia published e public: le policy non rileggono
  biographies (ricorsione), passano da biography_public_read_allowed.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colonna, tag obbligatorio, unicità per lingua
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS translation_of uuid REFERENCES public.biographies(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.biographies.translation_of IS
  'Originale di cui questa riga è la traduzione. Nullo sugli originali. Immutabile. Lo scrive solo il server.';

UPDATE public.biographies
SET record_language_tag = COALESCE(
  NULLIF(BTRIM(record_language_tag), ''),
  NULLIF(BTRIM(content_language), ''),
  'und'
)
WHERE record_language_tag IS NULL OR BTRIM(record_language_tag) = '';

UPDATE public.biographies
SET record_script = 'Latn'
WHERE record_script IS NULL OR BTRIM(record_script) = '';

UPDATE public.biographies
SET record_direction = 'ltr'
WHERE record_direction IS NULL OR BTRIM(record_direction) = '';

ALTER TABLE public.biographies
  ALTER COLUMN record_language_tag SET NOT NULL,
  ALTER COLUMN record_script SET NOT NULL,
  ALTER COLUMN record_direction SET NOT NULL;

ALTER TABLE public.biographies
  DROP CONSTRAINT IF EXISTS biographies_content_language_check;

CREATE UNIQUE INDEX IF NOT EXISTS biographies_one_language_per_work
  ON public.biographies ((COALESCE(translation_of, id)), record_language_tag);

CREATE INDEX IF NOT EXISTS biographies_translation_of_idx
  ON public.biographies (translation_of)
  WHERE translation_of IS NOT NULL;

CREATE INDEX IF NOT EXISTS biographies_record_language_tag_idx
  ON public.biographies (record_language_tag);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Lettura pubblica senza rileggere biographies dalla policy
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.biography_public_read_allowed(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.biographies b
    JOIN public.profiles p ON p.id = b.user_id
    WHERE b.id = p_id
      AND b.status = 'published'
      AND b.visibility = 'public'
      AND p.account_status = 'active'
      AND (
        b.translation_of IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.biographies o
          JOIN public.profiles op ON op.id = o.user_id
          WHERE o.id = b.translation_of
            AND o.translation_of IS NULL
            AND o.status = 'published'
            AND o.visibility = 'public'
            AND op.account_status = 'active'
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.biography_public_read_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.biography_public_read_allowed(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public read for published biographies" ON public.biographies;
CREATE POLICY "Public read for published biographies"
  ON public.biographies
  FOR SELECT
  TO anon
  USING (public.biography_public_read_allowed(id));

DROP POLICY IF EXISTS "Biographies: owner or public access" ON public.biographies;
CREATE POLICY "Biographies: owner or public access"
  ON public.biographies
  FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['reviewer', 'admin', 'super_admin'])
      )
    )
    OR (
      status <> 'removed'
      AND (
        (
          user_id = (SELECT auth.uid())
          AND public.get_my_account_status() = 'active'
        )
        OR public.biography_public_read_allowed(id)
      )
    )
  );

-- Eventi e relazioni: la lettura pubblica segue la stessa regola dell'edizione.
DROP POLICY IF EXISTS "person_events: public select" ON public.person_events;
CREATE POLICY "person_events: public select"
  ON public.person_events
  FOR SELECT
  TO anon, authenticated
  USING (public.biography_public_read_allowed(biography_id));

DROP POLICY IF EXISTS "person_relations: public select" ON public.person_relations;
CREATE POLICY "person_relations: public select"
  ON public.person_relations
  FOR SELECT
  TO anon, authenticated
  USING (public.biography_public_read_allowed(biography_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Didascalie per edizione
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.biography_edition_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.biography_media(id) ON DELETE CASCADE,
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (biography_id, media_id)
);

COMMENT ON TABLE public.biography_edition_captions IS
  'Didascalie di un''edizione sulle foto dell''originale. Non entrano nell''impronta dell''originale.';

ALTER TABLE public.biography_edition_captions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Edition captions: public read" ON public.biography_edition_captions;
CREATE POLICY "Edition captions: public read"
  ON public.biography_edition_captions
  FOR SELECT
  TO anon, authenticated
  USING (public.biography_public_read_allowed(biography_id));

DROP POLICY IF EXISTS "Edition captions: owner or staff read" ON public.biography_edition_captions;
CREATE POLICY "Edition captions: owner or staff read"
  ON public.biography_edition_captions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = biography_id
        AND (
          (
            b.user_id = (SELECT auth.uid())
            AND public.get_my_account_status() = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role = ANY (ARRAY['reviewer', 'admin', 'super_admin'])
          )
        )
    )
  );

DROP POLICY IF EXISTS "Edition captions: owner write" ON public.biography_edition_captions;
CREATE POLICY "Edition captions: owner write"
  ON public.biography_edition_captions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = biography_id
        AND b.user_id = (SELECT auth.uid())
        AND b.translation_of IS NOT NULL
        AND COALESCE(b.is_frozen, false) = false
        AND public.get_my_account_status() = 'active'
    )
  );

DROP POLICY IF EXISTS "Edition captions: owner update" ON public.biography_edition_captions;
CREATE POLICY "Edition captions: owner update"
  ON public.biography_edition_captions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = biography_id
        AND b.user_id = (SELECT auth.uid())
        AND b.translation_of IS NOT NULL
        AND COALESCE(b.is_frozen, false) = false
        AND public.get_my_account_status() = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = biography_id
        AND b.user_id = (SELECT auth.uid())
        AND b.translation_of IS NOT NULL
        AND COALESCE(b.is_frozen, false) = false
        AND public.get_my_account_status() = 'active'
    )
  );

DROP POLICY IF EXISTS "Edition captions: owner delete" ON public.biography_edition_captions;
CREATE POLICY "Edition captions: owner delete"
  ON public.biography_edition_captions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
        AND public.get_my_account_status() = 'active'
    )
  );

GRANT SELECT ON public.biography_edition_captions TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.biography_edition_captions TO authenticated, service_role;

-- Stesso blocco delle altre tabelle che arrivano al pubblico: lo stato della scheda
-- madre. a01_ è prima di ogni altro trigger sulla tabella.
DROP TRIGGER IF EXISTS a01_biography_edition_captions_guard_parent_status ON public.biography_edition_captions;
CREATE TRIGGER a01_biography_edition_captions_guard_parent_status
  BEFORE INSERT OR UPDATE OR DELETE ON public.biography_edition_captions
  FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();

-- La foto è dell'originale, non di un'altra scheda. Vale anche per il servizio.
CREATE OR REPLACE FUNCTION public.edition_caption_media_on_original()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  original_id uuid;
BEGIN
  SELECT b.translation_of INTO original_id
  FROM public.biographies b
  WHERE b.id = NEW.biography_id;

  IF original_id IS NULL THEN
    RAISE EXCEPTION 'caption_requires_edition'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.biography_media m
    WHERE m.id = NEW.media_id
      AND m.biography_id = original_id
  ) THEN
    RAISE EXCEPTION 'caption_media_not_on_original'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.edition_caption_media_on_original() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_biography_edition_captions_media_on_original ON public.biography_edition_captions;
CREATE TRIGGER trg_biography_edition_captions_media_on_original
  BEFORE INSERT OR UPDATE OF media_id, biography_id ON public.biography_edition_captions
  FOR EACH ROW EXECUTE FUNCTION public.edition_caption_media_on_original();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. translation_of riservata al server
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.biographies_server_owned_columns()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'id', 'user_id', 'created_at', 'schema_version',
    'ai_screening_status',
    'published_at', 'published_at_iso', 'published_um_year',
    'provisional_until', 'revised_at',
    'reviewed_by', 'reviewed_at',
    'final_pdf_approved_at', 'final_pdf_url', 'listing_cover_url',
    'export_txt_url', 'export_docx_url',
    'pdf_draft_iteration', 'pdf_draft_started_at', 'pdf_draft_reminder_sent_at',
    'draft_ai_feedback',
    'is_frozen', 'frozen_at', 'frozen_reason',
    'is_featured', 'featured_at', 'featured_by',
    'view_count',
    'chapters_count', 'last_chapter_published_at', 'next_chapter_available_at',
    'chapter_available_email_sent_at',
    'is_pioneer', 'um_id',
    'translation_of'
  ]::text[];
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Regole dell'edizione, Pioniere, capitolo annuale
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.biographies_edition_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent public.biographies%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.translation_of IS DISTINCT FROM OLD.translation_of THEN
    RAISE EXCEPTION 'translation_of is immutable once assigned'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.translation_of IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO parent FROM public.biographies WHERE id = NEW.translation_of;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'translation_original_missing'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF parent.translation_of IS NOT NULL THEN
    RAISE EXCEPTION 'translation_of_edition'
      USING ERRCODE = 'check_violation';
  END IF;
  IF parent.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'translation_owner_mismatch'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.biographies_edition_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_biographies_edition_rules ON public.biographies;
CREATE TRIGGER trg_biographies_edition_rules
  BEFORE INSERT OR UPDATE ON public.biographies
  FOR EACH ROW EXECUTE FUNCTION public.biographies_edition_rules();

CREATE OR REPLACE FUNCTION public.enforce_one_biography_per_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.biographies
    WHERE user_id = NEW.user_id
      AND translation_of IS NULL
  ) THEN
    RAISE EXCEPTION 'one_biography_per_user'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.biographies_mark_pioneer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host_n bigint;
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    NEW.is_pioneer := false;
    RETURN NEW;
  END IF;

  host_n := nextval('public.biography_host_seq');
  NEW.is_pioneer := host_n <= 10000;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_biography_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'published'
     AND (OLD.status IS DISTINCT FROM 'published') THEN

    IF COALESCE(OLD.chapters_count, 0) > 0
       AND OLD.next_chapter_available_at IS NOT NULL
       AND now() < OLD.next_chapter_available_at
       AND COALESCE(public.get_my_role(), 'user') NOT IN ('reviewer', 'admin', 'super_admin') THEN
      RAISE EXCEPTION 'chapter_cooldown_active'
        USING ERRCODE = 'check_violation';
    END IF;

    NEW.last_chapter_published_at := now();
    NEW.chapters_count := COALESCE(OLD.chapters_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_next_chapter_available_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.last_chapter_published_at IS NOT NULL
     AND (OLD.last_chapter_published_at IS DISTINCT FROM NEW.last_chapter_published_at)
  THEN
    NEW.next_chapter_available_at := NEW.last_chapter_published_at + INTERVAL '365 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Eventi e relazioni restano dell'originale.
CREATE OR REPLACE FUNCTION public.reject_life_facts_on_edition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.biographies b
    WHERE b.id = NEW.biography_id AND b.translation_of IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'life_facts_belong_to_original'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_life_facts_on_edition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_person_events_original_only ON public.person_events;
CREATE TRIGGER trg_person_events_original_only
  BEFORE INSERT OR UPDATE ON public.person_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_life_facts_on_edition();

DROP TRIGGER IF EXISTS trg_person_relations_original_only ON public.person_relations;
CREATE TRIGGER trg_person_relations_original_only
  BEFORE INSERT OR UPDATE ON public.person_relations
  FOR EACH ROW EXECUTE FUNCTION public.reject_life_facts_on_edition();

-- Sul banco di prova il CHECK non c'era (migrazione precedente allo snapshot).
-- In produzione la definizione è già questa: la si riafferma, identica.
ALTER TABLE public.biographies DROP CONSTRAINT IF EXISTS biographies_status_check;
ALTER TABLE public.biographies
  ADD CONSTRAINT biographies_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'sections_complete'::text,
    'final_version'::text,
    'pdf_draft'::text,
    'locked_pending_screening'::text,
    'under_review'::text,
    'published'::text,
    'removed'::text,
    'suspended_pending_verification'::text,
    'revision_requested'::text,
    'revision_pending_review'::text,
    'revision_overdue'::text
  ]));
