/*
  # Registro del consumo dei modelli e tetti in token

  ai_token_usage: una riga per ogni chiamata a un modello (anche fallita), con
  i valori di `usage` restituiti dal fornitore. Per trascrizione e sintesi vocale
  non si inventano conversioni in token: si registra l'unità del fornitore in
  usage_unit / usage_units: secondi se il fornitore li restituisce, caratteri per
  la sintesi vocale, byte del file per la trascrizione (Infomaniak Whisper,
  verificato il 30 settembre 2026, restituisce solo file_size, non la durata).

  ai_author_token_limits: tre tetti per l'autore (giorno, settimana, mese),
  nulli = disattivati (valori iniziali: 400.000, 1.500.000, 4.000.000). Il conteggio segue i periodi di calendario nel fuso
  Europe/Zurich (settimana ISO, da lunedì). Contano nel tetto solo le chiamate
  che l'autore scatena lavorando (echo, grammar): mai screening, preprint_check,
  embedding, memory_compression.

  Scrive solo il ruolo di servizio.
*/

CREATE TABLE IF NOT EXISTS public.ai_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  biography_id uuid REFERENCES public.biographies(id) ON DELETE SET NULL,
  purpose text NOT NULL CHECK (purpose IN (
    'echo', 'grammar', 'preprint_check', 'screening',
    'embedding', 'memory_compression', 'transcription', 'tts'
  )),
  model text,
  prompt_tokens integer CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens integer CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  total_tokens integer CHECK (total_tokens IS NULL OR total_tokens >= 0),
  estimated boolean NOT NULL DEFAULT false,
  usage_unit text CHECK (usage_unit IS NULL OR usage_unit IN ('seconds', 'characters', 'bytes')),
  usage_units numeric CHECK (usage_units IS NULL OR usage_units >= 0),
  ok boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_token_usage_unit_pair CHECK ((usage_unit IS NULL) = (usage_units IS NULL))
);

CREATE INDEX IF NOT EXISTS ai_token_usage_user_created_idx
  ON public.ai_token_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_token_usage_purpose_created_idx
  ON public.ai_token_usage (purpose, created_at DESC);

ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai usage"
  ON public.ai_token_usage FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Staff read all ai usage"
  ON public.ai_token_usage FOR SELECT TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['reviewer', 'admin', 'super_admin']));

-- Nessuna policy di scrittura: solo service_role (bypassa RLS). Tolti anche i
-- privilegi di tabella concessi di default, come seconda barriera.
REVOKE INSERT, UPDATE, DELETE ON public.ai_token_usage FROM authenticated, anon;

CREATE TABLE IF NOT EXISTS public.ai_author_token_limits (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  daily_tokens bigint CHECK (daily_tokens IS NULL OR daily_tokens > 0),
  weekly_tokens bigint CHECK (weekly_tokens IS NULL OR weekly_tokens > 0),
  monthly_tokens bigint CHECK (monthly_tokens IS NULL OR monthly_tokens > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tetti iniziali fissati il 30 settembre 2026 (circa 90 turni di Echo al giorno, sui
-- consumi misurati); si cambiano con un UPDATE di questa riga, come servizio.
INSERT INTO public.ai_author_token_limits (id, daily_tokens, weekly_tokens, monthly_tokens)
VALUES (true, 400000, 1500000, 4000000)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_author_token_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read ai token limits"
  ON public.ai_author_token_limits FOR SELECT TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['reviewer', 'admin', 'super_admin']));

REVOKE INSERT, UPDATE, DELETE ON public.ai_author_token_limits FROM authenticated, anon;

/*
  Consumo dell'autore nei periodi di calendario Europe/Zurich, con l'istante in
  cui ogni periodo si riapre. p_now è un parametro per poterlo provare con date
  fisse. p_purposes ha come valore predefinito l'insieme che conta nel tetto
  (lo stesso di CAP_COUNTED_PURPOSES in lib/ai/token-caps.ts).
*/
CREATE OR REPLACE FUNCTION public.ai_author_token_usage(
  p_user_id uuid,
  p_now timestamptz DEFAULT now(),
  p_purposes text[] DEFAULT ARRAY['echo', 'grammar']
)
RETURNS TABLE (
  daily_tokens bigint,
  weekly_tokens bigint,
  monthly_tokens bigint,
  daily_resets_at timestamptz,
  weekly_resets_at timestamptz,
  monthly_resets_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH local_now AS (
    SELECT p_now AT TIME ZONE 'Europe/Zurich' AS t
  ),
  bounds AS (
    SELECT
      (date_trunc('day',   t) AT TIME ZONE 'Europe/Zurich') AS d0,
      (date_trunc('week',  t) AT TIME ZONE 'Europe/Zurich') AS w0,
      (date_trunc('month', t) AT TIME ZONE 'Europe/Zurich') AS m0,
      ((date_trunc('day',   t) + interval '1 day')   AT TIME ZONE 'Europe/Zurich') AS d1,
      ((date_trunc('week',  t) + interval '1 week')  AT TIME ZONE 'Europe/Zurich') AS w1,
      ((date_trunc('month', t) + interval '1 month') AT TIME ZONE 'Europe/Zurich') AS m1
    FROM local_now
  ),
  rows_in_scope AS (
    SELECT
      u.created_at,
      COALESCE(u.total_tokens, COALESCE(u.prompt_tokens, 0) + COALESCE(u.completion_tokens, 0)) AS tokens
    FROM public.ai_token_usage u, bounds b
    WHERE u.user_id = p_user_id
      AND u.purpose = ANY (p_purposes)
      AND u.created_at >= LEAST(b.w0, b.m0)
      AND u.created_at <= p_now
  )
  SELECT
    COALESCE(SUM(r.tokens) FILTER (WHERE r.created_at >= b.d0), 0)::bigint,
    COALESCE(SUM(r.tokens) FILTER (WHERE r.created_at >= b.w0), 0)::bigint,
    COALESCE(SUM(r.tokens) FILTER (WHERE r.created_at >= b.m0), 0)::bigint,
    b.d1, b.w1, b.m1
  FROM bounds b
  LEFT JOIN rows_in_scope r ON true
  GROUP BY b.d0, b.w0, b.m0, b.d1, b.w1, b.m1;
$$;

REVOKE ALL ON FUNCTION public.ai_author_token_usage(uuid, timestamptz, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_author_token_usage(uuid, timestamptz, text[]) TO service_role;
