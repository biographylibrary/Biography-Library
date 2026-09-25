/*
  Prime 10.000 biografie ospitate.

  Il numero è l'ordine di creazione e non torna indietro se una scheda viene
  cancellata. Non tocca um_id né um_identifiers.
*/

CREATE SEQUENCE IF NOT EXISTS public.biography_host_seq AS bigint;

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS is_pioneer boolean NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS n
  FROM public.biographies
)
UPDATE public.biographies AS b
SET is_pioneer = (ranked.n <= 10000)
FROM ranked
WHERE b.id = ranked.id;

DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.biographies;
  PERFORM setval('public.biography_host_seq', GREATEST(n, 1), n > 0);
END $$;

CREATE OR REPLACE FUNCTION public.biographies_mark_pioneer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host_n bigint;
BEGIN
  host_n := nextval('public.biography_host_seq');
  NEW.is_pioneer := host_n <= 10000;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_biographies_mark_pioneer ON public.biographies;
CREATE TRIGGER trg_biographies_mark_pioneer
  BEFORE INSERT ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.biographies_mark_pioneer();

CREATE OR REPLACE FUNCTION public.biographies_keep_pioneer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_pioneer := OLD.is_pioneer;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_biographies_keep_pioneer ON public.biographies;
CREATE TRIGGER trg_biographies_keep_pioneer
  BEFORE UPDATE ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.biographies_keep_pioneer();

GRANT USAGE, SELECT ON SEQUENCE public.biography_host_seq TO anon, authenticated, service_role;
