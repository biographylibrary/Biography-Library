/*
  # kb_index_state — versione/hash KB indicizzata per Echo

  Tiene l'impronta globale del manuale/KB (da kb:sync) per lingua, più un
  lock con scadenza così un reseed interrotto non blocca Echo per sempre.
  Solo service_role: RLS deny-all come kb_chunks.
*/

CREATE TABLE IF NOT EXISTS public.kb_index_state (
  locale text PRIMARY KEY,
  version text NOT NULL,
  content_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  reseed_locked_until timestamptz NULL
);

ALTER TABLE public.kb_index_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_index_state_deny_all ON public.kb_index_state;
CREATE POLICY kb_index_state_deny_all ON public.kb_index_state
  FOR ALL
  USING (false);

REVOKE ALL ON TABLE public.kb_index_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.kb_index_state TO service_role;
