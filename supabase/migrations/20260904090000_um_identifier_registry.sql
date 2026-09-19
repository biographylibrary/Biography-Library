/*
  # Registro permanente degli identificativi UM

  ## Scopo
  Ogni scheda riceve un identificativo UM immutabile. Questa tabella è il
  registro di emissione: sopravvive alla cancellazione della scheda, così
  l'identificativo non torna mai disponibile e il risolutore continua a
  rispondere (specifica pubblica §8 e §9).

  ## Nessun dato personale
  `um_identifiers` non contiene alcun dato personale — solo una stringa
  opaca, un anno UM e un istante di emissione. È deliberato: è ciò che le
  consente di sopravvivere alla cancellazione di una scheda anche quando un
  utente esercita il diritto alla cancellazione. Ciò che sopravvive è il
  fatto che un identificativo è stato emesso, non chi identificava.

  ## Security
  RLS abilitata. Nessuna policy per anon/authenticated: lettura e scrittura
  solo via service role (risolutore e coniazione server-side).
*/

CREATE TABLE IF NOT EXISTS public.um_identifiers (
  um_id         text PRIMARY KEY,  -- forma normalizzata: minuscola, senza trattini
  um_year       integer NOT NULL,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  biography_id  uuid REFERENCES public.biographies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS um_identifiers_biography_idx
  ON public.um_identifiers (biography_id)
  WHERE biography_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS um_identifiers_issued_at_idx
  ON public.um_identifiers (issued_at);

COMMENT ON TABLE public.um_identifiers IS
  'Registro permanente identificativi UM. Nessun dato personale: sopravvive alla cancellazione della scheda (diritto alla cancellazione).';

ALTER TABLE public.um_identifiers ENABLE ROW LEVEL SECURITY;
