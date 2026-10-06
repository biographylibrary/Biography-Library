/*
  # Tabella di sicurezza per l'HTML di origine prima della conversione Markdown

  Conserva per 180 giorni il testo HTML sostituito quando il Markdown diventa
  l'unica origine. Una riga per campo convertito; per `revision_history` si usa
  anche `entry_id` (versione o indice della voce).

  Sicurezza: RLS attiva, nessuna policy. Solo `service_role` legge e scrive.
  `biography_id` ha ON DELETE CASCADE. Indice su FK. Chiave univoca espressa
  su (biography_id, source_column, coalesce(entry_id, '')) per riesecuzioni
  idempotenti (ON CONFLICT DO NOTHING).
*/

CREATE TABLE IF NOT EXISTS public.biography_source_html_legacy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies (id) ON DELETE CASCADE,
  source_column text NOT NULL,
  entry_id text NULL,
  content text NOT NULL,
  converted_at timestamptz NOT NULL DEFAULT now(),
  purge_after timestamptz NOT NULL DEFAULT (now() + interval '180 days')
);

COMMENT ON TABLE public.biography_source_html_legacy IS
  'HTML di origine conservato 180 giorni dopo la conversione a Markdown (blocco 2). Svuotabile dopo purge_after.';

COMMENT ON COLUMN public.biography_source_html_legacy.source_column IS
  'Percorso logico: content.<key>.text, content_freeflow, final_version, sections.<key>, book.<field>, revision_history';

COMMENT ON COLUMN public.biography_source_html_legacy.entry_id IS
  'Per revision_history: identificativo della voce (es. version o indice). Altrimenti NULL.';

CREATE INDEX IF NOT EXISTS biography_source_html_legacy_biography_id_idx
  ON public.biography_source_html_legacy (biography_id);

CREATE INDEX IF NOT EXISTS biography_source_html_legacy_purge_after_idx
  ON public.biography_source_html_legacy (purge_after);

CREATE UNIQUE INDEX IF NOT EXISTS biography_source_html_legacy_source_uidx
  ON public.biography_source_html_legacy (
    biography_id,
    source_column,
    (COALESCE(entry_id, ''))
  );

ALTER TABLE public.biography_source_html_legacy ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.biography_source_html_legacy FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.biography_source_html_legacy TO service_role;
