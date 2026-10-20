/*
  # Site settings (maintenance flag)

  Key/value store for platform-wide switches. First key: `maintenance`
  (`{"enabled": false}`). Readable by anon/authenticated only for that key;
  writes are service_role only (admin API routes).
*/

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.site_settings IS
  'Platform-wide settings (key/value). Written only via service_role.';

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.site_settings TO anon, authenticated;
GRANT ALL ON TABLE public.site_settings TO service_role;

CREATE POLICY "anon_authenticated_read_maintenance_only"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'maintenance');

INSERT INTO public.site_settings (key, value)
VALUES ('maintenance', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
