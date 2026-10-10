/*
  # original_version_at e allineamento visibilità/licenza delle edizioni

  - original_version_at: data di versione dell'originale
    (COALESCE(revised_at, published_at)) a cui la traduzione è allineata.
    Solo sulle edizioni; riservata al server. Non entra in biography_flat.
  - Visibilità e licenza di un'edizione seguono sempre l'originale
    (visibility, rights_statement_uri, rights_chosen_at, rights_holder).
*/

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS original_version_at timestamptz;

COMMENT ON COLUMN public.biographies.original_version_at IS
  'Data di versione dell''originale (COALESCE(revised_at, published_at)) a cui questa traduzione è stata allineata l''ultima volta. Valorizzata solo sulle edizioni. Lo scrive solo il server.';

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
    'translation_of',
    'original_version_at'
  ]::text[];
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Visibilità e licenza: solo sull'originale; le edizioni le ereditano
-- ─────────────────────────────────────────────────────────────────────────────

-- L'autore non può far divergere queste colonne su un'edizione.
-- Il ruolo di servizio e il trigger di sincronizzazione (SECURITY DEFINER) sì.
CREATE OR REPLACE FUNCTION public.biographies_edition_visibility_rights_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.translation_of IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       NEW.visibility IS DISTINCT FROM OLD.visibility
       OR NEW.rights_statement_uri IS DISTINCT FROM OLD.rights_statement_uri
       OR NEW.rights_chosen_at IS DISTINCT FROM OLD.rights_chosen_at
       OR NEW.rights_holder IS DISTINCT FROM OLD.rights_holder
     ) THEN
    RAISE EXCEPTION 'edition_visibility_rights_follow_original'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.biographies_edition_visibility_rights_immutable() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_biographies_edition_visibility_rights_immutable ON public.biographies;
CREATE TRIGGER trg_biographies_edition_visibility_rights_immutable
  BEFORE UPDATE OF visibility, rights_statement_uri, rights_chosen_at, rights_holder
  ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.biographies_edition_visibility_rights_immutable();

-- Dopo ogni modifica sull'originale, le edizioni ricevono gli stessi valori.
-- SECURITY DEFINER: la sessione è ancora authenticated (l'autore ha aggiornato
-- l'originale); senza DEFINER il trigger sopra rifiuterebbe la scrittura sulle
-- edizioni. Con DEFINER il proprietario della funzione scrive e supera anche RLS.
CREATE OR REPLACE FUNCTION public.biographies_sync_edition_visibility_rights()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.visibility IS NOT DISTINCT FROM OLD.visibility
     AND NEW.rights_statement_uri IS NOT DISTINCT FROM OLD.rights_statement_uri
     AND NEW.rights_chosen_at IS NOT DISTINCT FROM OLD.rights_chosen_at
     AND NEW.rights_holder IS NOT DISTINCT FROM OLD.rights_holder THEN
    RETURN NEW;
  END IF;

  UPDATE public.biographies
  SET
    visibility = NEW.visibility,
    rights_statement_uri = NEW.rights_statement_uri,
    rights_chosen_at = NEW.rights_chosen_at,
    rights_holder = NEW.rights_holder
  WHERE translation_of = NEW.id
    AND (
      visibility IS DISTINCT FROM NEW.visibility
      OR rights_statement_uri IS DISTINCT FROM NEW.rights_statement_uri
      OR rights_chosen_at IS DISTINCT FROM NEW.rights_chosen_at
      OR rights_holder IS DISTINCT FROM NEW.rights_holder
    );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.biographies_sync_edition_visibility_rights() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_biographies_sync_edition_visibility_rights ON public.biographies;
CREATE TRIGGER trg_biographies_sync_edition_visibility_rights
  AFTER UPDATE OF visibility, rights_statement_uri, rights_chosen_at, rights_holder
  ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.biographies_sync_edition_visibility_rights();
