-- Raise gallery photo cap to 30; cover and cover_a5 do not count toward the limit.

CREATE OR REPLACE FUNCTION public.check_biography_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.layout IN ('cover', 'cover_a5') THEN
    RETURN NEW;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.biography_media
    WHERE biography_id = NEW.biography_id
      AND layout NOT IN ('cover', 'cover_a5')
  ) >= 30 THEN
    RAISE EXCEPTION 'A biography may have at most 30 gallery photos.';
  END IF;

  RETURN NEW;
END;
$$;
