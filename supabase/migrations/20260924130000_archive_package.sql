/*
  # Pacchetto d'archivio

  Bucket privato `archive` (niente lettura pubblica).
  Tabella delle versioni: numero, data, impronta del MANIFEST.txt, motivo, stato.
  provisional_until: solo memorial, published_at + 30 giorni. Il pacchetto v1
  del memorial si versa quando questa data è passata, non alla pubblicazione.
*/

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS provisional_until timestamptz;

COMMENT ON COLUMN public.biographies.provisional_until IS
  'Fine finestra memorial (published_at + 30 giorni). NULL per le autobiografie. Non è uno stato.';

CREATE TABLE IF NOT EXISTS public.archive_package_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies(id) ON DELETE CASCADE,
  um_id text NOT NULL,
  version_number integer NOT NULL CHECK (version_number >= 1),
  generated_at timestamptz NOT NULL,
  manifest_sha256 text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('publication', 'provisional_expired', 'republication')),
  status text NOT NULL DEFAULT 'stored' CHECK (status IN ('stored', 'destroyed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (biography_id, version_number)
);

ALTER TABLE public.archive_package_versions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.archive_package_versions IS
  'Versioni del pacchetto archive/{UM}/v{N}. L''impronta è quella di MANIFEST.txt, non di index.json.';

INSERT INTO storage.buckets (id, name, public)
VALUES ('archive', 'archive', false)
ON CONFLICT (id) DO NOTHING;
