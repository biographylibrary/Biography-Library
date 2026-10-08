/*
  # Registro dei controlli finali prima della stampa

  Una riga per ogni esecuzione riuscita del controllo di qualità pre-stampa.
  Limiti applicativi: una sola volta per impronta del contenuto; al massimo
  PREPRINT_CHECK_MAX_PER_30_DAYS (config in lib/preprint-check-constants.ts)
  per biografia negli ultimi 30 giorni. Fuori dal tetto token dell'autore
  (scopo ai_token_usage = preprint_check).
*/

CREATE TABLE IF NOT EXISTS public.preprint_check_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies (id) ON DELETE CASCADE,
  content_fingerprint text NOT NULL
    CHECK (content_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS preprint_check_runs_biography_created_idx
  ON public.preprint_check_runs (biography_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS preprint_check_runs_biography_fingerprint_uidx
  ON public.preprint_check_runs (biography_id, content_fingerprint);

COMMENT ON TABLE public.preprint_check_runs IS
  'Esecuzioni del controllo finale prima della stampa (una per impronta di contenuto).';

ALTER TABLE public.preprint_check_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.preprint_check_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.preprint_check_runs TO service_role;
