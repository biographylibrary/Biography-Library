/*
  # person_relations — relazioni familiari / sociali

  relation_label è autorevole; relation_code è orientativo.
  RLS derivata dalla scheda madre, come person_events.
*/

CREATE TABLE IF NOT EXISTS public.person_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies(id) ON DELETE CASCADE,

  relation_code text,
  relation_label text NOT NULL,
  direction text NOT NULL DEFAULT 'from-subject',

  related_um_id text,
  related_name_as_written text,
  related_name_romanized text,

  valid_from_edtf text,
  valid_to_edtf text,

  asserted_by text,
  asserted_by_label text,
  source_note text,
  confidence text,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_relations_confidence_check
    CHECK (confidence IS NULL OR confidence IN ('certain', 'probable', 'uncertain', 'unknown'))
);

CREATE INDEX IF NOT EXISTS person_relations_biography_idx
  ON public.person_relations (biography_id);

ALTER TABLE public.person_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_relations: owner select"
  ON public.person_relations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_relations.biography_id AND b.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "person_relations: public select"
  ON public.person_relations FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      JOIN public.profiles p ON p.id = b.user_id
      WHERE b.id = person_relations.biography_id
        AND b.status = 'published'
        AND b.visibility = 'public'
        AND p.account_status = 'active'
    )
  );

CREATE POLICY "person_relations: owner insert"
  ON public.person_relations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_relations.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  );

CREATE POLICY "person_relations: owner update"
  ON public.person_relations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_relations.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_relations.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  );

CREATE POLICY "person_relations: owner delete"
  ON public.person_relations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id = person_relations.biography_id
        AND b.user_id = (SELECT auth.uid())
        AND COALESCE(b.is_frozen, false) = false
    )
  );
