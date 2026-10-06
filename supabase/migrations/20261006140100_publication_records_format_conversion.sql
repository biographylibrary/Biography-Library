/*
  # Motivo e riferimento per la conversione di formato Markdown

  Il comando di conversione HTML→Markdown registra una riga di screening con
  l'impronta del testo già convertito, riprendendo verdetto e conteggi dallo
  screening precedente (senza rilanciare il modello). `reason` e
  `previous_record_id` documentano il legame. Solo il ruolo di servizio scrive.
*/

ALTER TABLE public.publication_records
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS previous_record_id uuid
    REFERENCES public.publication_records (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.publication_records.reason IS
  'Motivo della riga quando non è uno screening o una pubblicazione ordinari (es. conversione di formato).';

COMMENT ON COLUMN public.publication_records.previous_record_id IS
  'Riga di publication_records a cui questa si riferisce (es. screening precedente alla conversione).';

CREATE INDEX IF NOT EXISTS publication_records_previous_record_id_idx
  ON public.publication_records (previous_record_id)
  WHERE previous_record_id IS NOT NULL;
