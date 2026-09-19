/*
  # Identità di scheda, diritti e colonne di pubblicazione UM

  ## Scopo
  Colonne B1 del brief permanenza: um_id, lingua/scrittura/direzione,
  nomi autorevoli, diritti/consenso, e campi di pubblicazione in doppia
  notazione (ISO + anno UM) riempiti da trigger in UTC.

  ## Note
  - `content_language` resta intatta (CHECK a 4 lingue UI); `record_language_tag`
    è il campo autorevole BCP 47 destinato a sostituirla.
  - `published_at_iso` / `published_um_year` sono colonne normali riempite da
    trigger BEFORE INSERT OR UPDATE (UTC), non colonne generate.
  - Epoca UM 2026: deve restare allineata a lib/um.ts UM_EPOCH_YEAR.
  - Trigger diritti: una scheda non può assumere visibility='public' senza
    rights_statement_uri. Su INSERT e su transizione verso public.
*/

-- ---------------------------------------------------------------------------
-- Colonne
-- ---------------------------------------------------------------------------

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS um_id text,
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 2,

  ADD COLUMN IF NOT EXISTS record_language_tag text,
  ADD COLUMN IF NOT EXISTS record_script text,
  ADD COLUMN IF NOT EXISTS record_direction text,
  ADD COLUMN IF NOT EXISTS record_language_endonym text,

  ADD COLUMN IF NOT EXISTS name_as_written text,
  ADD COLUMN IF NOT EXISTS name_given text,
  ADD COLUMN IF NOT EXISTS name_family text,
  ADD COLUMN IF NOT EXISTS name_order text,
  ADD COLUMN IF NOT EXISTS name_romanized text,
  ADD COLUMN IF NOT EXISTS romanization_system text,

  ADD COLUMN IF NOT EXISTS published_at_iso date,
  ADD COLUMN IF NOT EXISTS published_um_year integer,

  ADD COLUMN IF NOT EXISTS rights_statement_uri text,
  ADD COLUMN IF NOT EXISTS rights_chosen_at timestamptz,
  ADD COLUMN IF NOT EXISTS rights_holder text,
  ADD COLUMN IF NOT EXISTS consent_basis text,
  ADD COLUMN IF NOT EXISTS consent_recorded_at timestamptz;

-- Vincoli CHECK (idempotenti via drop/add)
ALTER TABLE public.biographies
  DROP CONSTRAINT IF EXISTS biographies_record_direction_check;
ALTER TABLE public.biographies
  ADD CONSTRAINT biographies_record_direction_check
  CHECK (record_direction IS NULL OR record_direction IN ('ltr', 'rtl'));

ALTER TABLE public.biographies
  DROP CONSTRAINT IF EXISTS biographies_name_order_check;
ALTER TABLE public.biographies
  ADD CONSTRAINT biographies_name_order_check
  CHECK (
    name_order IS NULL
    OR name_order IN ('given-family', 'family-given', 'single', 'other')
  );

ALTER TABLE public.biographies
  DROP CONSTRAINT IF EXISTS biographies_consent_basis_check;
ALTER TABLE public.biographies
  ADD CONSTRAINT biographies_consent_basis_check
  CHECK (
    consent_basis IS NULL
    OR consent_basis IN ('self', 'family', 'public-domain', 'other')
  );

-- FK e unicità um_id → registro
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'biographies_um_id_fkey'
  ) THEN
    ALTER TABLE public.biographies
      ADD CONSTRAINT biographies_um_id_fkey
      FOREIGN KEY (um_id) REFERENCES public.um_identifiers(um_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS biographies_um_id_unique_idx
  ON public.biographies (um_id)
  WHERE um_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill lingua / scrittura / direzione dalle quattro lingue UI
-- ---------------------------------------------------------------------------

UPDATE public.biographies
SET
  record_language_tag = content_language,
  record_script = COALESCE(record_script, 'Latn'),
  record_direction = COALESCE(record_direction, 'ltr'),
  record_language_endonym = COALESCE(
    record_language_endonym,
    CASE content_language
      WHEN 'it' THEN 'italiano'
      WHEN 'en' THEN 'English'
      WHEN 'fr' THEN 'français'
      WHEN 'de' THEN 'Deutsch'
      ELSE content_language
    END
  ),
  name_as_written = COALESCE(
    name_as_written,
    CASE
      WHEN biography_type = 'memorial' THEN NULLIF(TRIM(COALESCE(subject_name, title)), '')
      ELSE NULLIF(TRIM(title), '')
    END
  )
WHERE record_language_tag IS NULL
   OR record_script IS NULL
   OR record_direction IS NULL
   OR name_as_written IS NULL;

-- ---------------------------------------------------------------------------
-- Trigger: um_id immutabile una volta assegnato
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.biographies_um_id_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.um_id IS NOT NULL AND NEW.um_id IS DISTINCT FROM OLD.um_id THEN
    RAISE EXCEPTION 'um_id is immutable once assigned';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_biographies_um_id_immutable ON public.biographies;
CREATE TRIGGER trg_biographies_um_id_immutable
  BEFORE UPDATE ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.biographies_um_id_immutable();

-- ---------------------------------------------------------------------------
-- Trigger: published_at_iso / published_um_year da published_at (UTC)
-- Epoca 2026 = lib/um.ts UM_EPOCH_YEAR
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.biographies_sync_published_um()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.published_at IS NULL THEN
    NEW.published_at_iso := NULL;
    NEW.published_um_year := NULL;
  ELSE
    NEW.published_at_iso := (NEW.published_at AT TIME ZONE 'UTC')::date;
    NEW.published_um_year :=
      EXTRACT(YEAR FROM (NEW.published_at AT TIME ZONE 'UTC'))::integer - 2026;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_biographies_sync_published_um ON public.biographies;
CREATE TRIGGER trg_biographies_sync_published_um
  BEFORE INSERT OR UPDATE OF published_at ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.biographies_sync_published_um();

-- Backfill righe già pubblicate
UPDATE public.biographies
SET published_at = published_at
WHERE published_at IS NOT NULL
  AND (published_at_iso IS NULL OR published_um_year IS NULL);

-- ---------------------------------------------------------------------------
-- Trigger: visibilità pubblica richiede licenza registrata
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.biographies_require_rights_for_public()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.visibility = 'public'
     AND COALESCE(BTRIM(NEW.rights_statement_uri), '') = '' THEN
    -- Su UPDATE: solo se si passa a public, o se si azzera la licenza su già public
    IF TG_OP = 'INSERT'
       OR OLD.visibility IS DISTINCT FROM 'public'
       OR COALESCE(BTRIM(OLD.rights_statement_uri), '') IS DISTINCT FROM COALESCE(BTRIM(NEW.rights_statement_uri), '') THEN
      RAISE EXCEPTION
        'una biografia pubblica richiede una licenza registrata: manca la scelta dell''autore';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_biographies_require_rights_for_public ON public.biographies;
CREATE TRIGGER trg_biographies_require_rights_for_public
  BEFORE INSERT OR UPDATE OF visibility, rights_statement_uri ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.biographies_require_rights_for_public();

COMMENT ON COLUMN public.biographies.um_id IS
  'Identificativo UM normalizzato (minuscolo, senza trattini). Immutabile.';
COMMENT ON COLUMN public.biographies.record_language_tag IS
  'BCP 47 autorevole. content_language è destinata al ritiro.';
COMMENT ON COLUMN public.biographies.rights_statement_uri IS
  'URI licenza scelta dall''autore. Obbligatoria per visibility=public.';
