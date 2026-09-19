/*
  # person_events — eventi di vita come righe atomiche

  Nascita, morte, matrimonio, migrazione: entità autonome con tipo, data EDTF,
  luogo e provenienza. Colonne JDN generate con espressione IMMUTABLE
  (date - date '2000-01-01') + 2451545  (JDN del 2000-01-01).

  RLS derivata dalla scheda madre (owner CRUD; lettura pubblica se la scheda
  è published + public).
*/

CREATE TABLE IF NOT EXISTS public.person_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies(id) ON DELETE CASCADE,

  event_type text NOT NULL,
  event_label text NOT NULL,
  sequence integer NOT NULL DEFAULT 0,

  date_edtf text,
  date_as_given text,
  calendar_code text,
  calendar_label text,
  date_start_iso date,
  date_end_iso date,
  date_start_jdn integer GENERATED ALWAYS AS (
    CASE
      WHEN date_start_iso IS NULL THEN NULL
      ELSE (date_start_iso - DATE '2000-01-01') + 2451545
    END
  ) STORED,
  date_end_jdn integer GENERATED ALWAYS AS (
    CASE
      WHEN date_end_iso IS NULL THEN NULL
      ELSE (date_end_iso - DATE '2000-01-01') + 2451545
    END
  ) STORED,

  place_name_as_given text,
  place_name_current text,
  place_lat numeric(9, 6),
  place_lon numeric(9, 6),
  place_geonames_id integer,
  place_wikidata_qid text,

  asserted_by text,
  asserted_by_label text,
  source_note text,
  confidence text,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_events_confidence_check
    CHECK (confidence IS NULL OR confidence IN ('certain', 'probable', 'uncertain', 'unknown'))
);

CREATE INDEX IF NOT EXISTS person_events_biography_idx
  ON public.person_events (biography_id);
CREATE INDEX IF NOT EXISTS person_events_type_idx
  ON public.person_events (event_type);

ALTER TABLE public.person_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_events: owner select"
  ON public.person_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_events.biography_id AND b.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "person_events: public select"
  ON public.person_events FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      JOIN public.profiles p ON p.id = b.user_id
      WHERE b.id = person_events.biography_id
        AND b.status = 'published'
        AND b.visibility = 'public'
        AND p.account_status = 'active'
    )
  );

CREATE POLICY "person_events: owner insert"
  ON public.person_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_events.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  );

CREATE POLICY "person_events: owner update"
  ON public.person_events FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_events.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_events.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  );

CREATE POLICY "person_events: owner delete"
  ON public.person_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_events.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  );
