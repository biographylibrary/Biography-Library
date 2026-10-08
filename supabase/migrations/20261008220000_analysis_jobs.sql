/*
  # Lavori di analisi in background (screening / controllo finale)

  Una riga per avvio. Al più un lavoro 'running' per (biography_id, kind).
  Accesso solo service_role: RLS attiva, nessuna policy, revoke a public/anon/authenticated.
  Non tocca biographies né i suoi trigger.
*/

CREATE TABLE IF NOT EXISTS public.analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('screening', 'preprint_check')),
  status text NOT NULL CHECK (status IN ('running', 'done', 'failed', 'interrupted')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  outcome jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT analysis_jobs_finished_when_terminal CHECK (
    (status = 'running' AND finished_at IS NULL)
    OR (status <> 'running' AND finished_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS analysis_jobs_one_running_per_bio_kind_uidx
  ON public.analysis_jobs (biography_id, kind)
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS analysis_jobs_biography_kind_started_idx
  ON public.analysis_jobs (biography_id, kind, started_at DESC);

COMMENT ON TABLE public.analysis_jobs IS
  'Lavori asincroni di screening di pubblicazione o controllo finale preprint.';

COMMENT ON COLUMN public.analysis_jobs.context IS
  'Metadati di avvio (es. reportId per lo screening della correzione dopo revisione).';

COMMENT ON COLUMN public.analysis_jobs.outcome IS
  'Esito a forma della risposta storica delle rotte (result/screeningDetail/… o feedback).';

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.analysis_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.analysis_jobs TO service_role;
