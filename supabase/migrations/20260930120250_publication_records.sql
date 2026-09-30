/*
  # Registro delle impronte di screening e di pubblicazione

  Garanzia: il testo che va online è esattamente quello che lo screening ha
  esaminato. Ogni volta che lo screening esamina una scheda si registra l'impronta
  SHA-256 del testo come lo vedrà il pubblico (pagina, PDF, archivio); chi pubblica
  la ricalcola e, se è diversa, non pubblica e rimette la scheda in coda con un
  errore esplicito. Anche la pubblicazione forzata dallo staff lascia una riga con
  l'impronta e chi l'ha forzata.

  Due tipi di riga:
    screening    lo screening ha esaminato il testo (esito passed, flagged, ai_error,
                 parse_error, text_changed); examined_chars è la parte davvero
                 inviata al modello, source_chars il testo di partenza intero
                 (oggi il modello riceve al massimo i primi 6000 caratteri;
                 examined_chars = 0 vuol dire che il testo è passato alla persona
                 senza essere esaminato dal modello di screening, per esempio dopo
                 un segnale grave del controllo prima della stampa);
    publication  una pubblicazione, con il modo (auto dopo screening, approvazione
                 umana, ripristino, forzata), chi l'ha fatta (actor_id nullo =
                 automatica) e l'impronta dello screening a cui si riferisce.

  Solo il ruolo di servizio legge e scrive: nessuna policy, privilegi tolti ai
  ruoli dell'API. Le righe seguono la scheda (ON DELETE CASCADE): sono impronte,
  non testo, ma eliminare l'account elimina anche il registro.
*/

CREATE TABLE IF NOT EXISTS public.publication_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES public.biographies(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('screening', 'publication')),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),

  -- righe 'screening'
  verdict text CHECK (verdict IS NULL OR verdict IN ('passed', 'flagged', 'ai_error', 'parse_error', 'text_changed')),
  scope text CHECK (scope IS NULL OR scope IN ('full', 'targeted')),
  examined_chars integer CHECK (examined_chars IS NULL OR examined_chars >= 0),
  source_chars integer CHECK (source_chars IS NULL OR source_chars >= 0),

  -- righe 'publication'
  mode text CHECK (mode IS NULL OR mode IN ('auto', 'human_approval', 'restore', 'forced')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  screening_record_id uuid REFERENCES public.publication_records(id) ON DELETE SET NULL,
  screening_fingerprint text CHECK (screening_fingerprint IS NULL OR screening_fingerprint ~ '^[0-9a-f]{64}$'),
  outcome text CHECK (outcome IS NULL OR outcome IN ('pending', 'published', 'failed')),

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT publication_records_screening_shape CHECK (
    kind <> 'screening' OR (verdict IS NOT NULL AND scope IS NOT NULL AND examined_chars IS NOT NULL AND mode IS NULL)
  ),
  CONSTRAINT publication_records_publication_shape CHECK (
    kind <> 'publication' OR (mode IS NOT NULL AND outcome IS NOT NULL AND verdict IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS publication_records_biography_created_idx
  ON public.publication_records (biography_id, created_at DESC);
CREATE INDEX IF NOT EXISTS publication_records_biography_kind_idx
  ON public.publication_records (biography_id, kind, created_at DESC);

ALTER TABLE public.publication_records ENABLE ROW LEVEL SECURITY;

-- Nessuna policy: solo service_role (bypassa RLS). Tolti anche i privilegi di
-- tabella che Supabase concede di default ai ruoli dell'API, come seconda barriera.
REVOKE ALL ON public.publication_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.publication_records TO service_role;
