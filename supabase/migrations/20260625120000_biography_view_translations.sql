/*
  # biography_view_translations — persisted on-demand reader translations

  Stores HTML section translations requested by readers. First request invokes AI;
  subsequent readers read from this table (no repeat AI calls).
*/

CREATE TABLE IF NOT EXISTS public.biography_view_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies(id) ON DELETE CASCADE,
  source_language text NOT NULL CHECK (source_language IN ('en', 'it', 'fr', 'de')),
  target_language text NOT NULL CHECK (target_language IN ('en', 'it', 'fr', 'de')),
  section_key text NOT NULL,
  translated_html text NOT NULL,
  source_content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (biography_id, target_language, section_key)
);

CREATE INDEX IF NOT EXISTS idx_bvt_biography_target
  ON public.biography_view_translations (biography_id, target_language);

ALTER TABLE public.biography_view_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read translations for public published biographies"
  ON public.biography_view_translations
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.biographies b
      WHERE b.id = biography_id
        AND b.visibility = 'public'
        AND b.status = 'published'
    )
  );

CREATE POLICY "Authenticated read translations for accessible biographies"
  ON public.biography_view_translations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.biographies b
      WHERE b.id = biography_id
        AND (
          (b.visibility = 'public' AND b.status = 'published')
          OR b.user_id = auth.uid()
          OR public.get_my_role() IN ('reviewer', 'admin', 'super_admin')
        )
    )
  );

COMMENT ON TABLE public.biography_view_translations IS
  'Cached reader-facing biography translations (on-demand AI, permanent storage).';
