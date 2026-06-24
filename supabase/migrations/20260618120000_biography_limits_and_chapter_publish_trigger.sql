/*
  Enforce one biography per user account and chapter cooldown on republication.

  - BEFORE INSERT: block a second biography row for the same user_id
  - BEFORE UPDATE: when status becomes published, increment chapters_count and
    set last_chapter_published_at (next_chapter_available_at follows existing trigger)
    unless the yearly cooldown is still active
*/

CREATE OR REPLACE FUNCTION public.enforce_one_biography_per_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.biographies
    WHERE user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'one_biography_per_user'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_one_biography_per_user ON public.biographies;

CREATE TRIGGER trg_enforce_one_biography_per_user
  BEFORE INSERT ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_one_biography_per_user();

CREATE OR REPLACE FUNCTION public.handle_biography_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (OLD.status IS DISTINCT FROM 'published') THEN

    IF COALESCE(OLD.chapters_count, 0) > 0
       AND OLD.next_chapter_available_at IS NOT NULL
       AND now() < OLD.next_chapter_available_at THEN
      RAISE EXCEPTION 'chapter_cooldown_active'
        USING ERRCODE = 'check_violation';
    END IF;

    NEW.last_chapter_published_at := now();
    NEW.chapters_count := COALESCE(OLD.chapters_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_biography_published ON public.biographies;

CREATE TRIGGER trg_handle_biography_published
  BEFORE UPDATE ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_biography_published();

-- RPC kept for backwards compatibility; publish trigger is the source of truth.
CREATE OR REPLACE FUNCTION public.increment_biography_chapters(biography_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE biographies
  SET
    last_chapter_published_at = now(),
    chapters_count = chapters_count + 1
  WHERE id = biography_id
    AND user_id = auth.uid()
    AND status = 'published';
END;
$$;
