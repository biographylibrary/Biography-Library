/*
  # Allow staff to bypass chapter republication cooldown

  When an admin/reviewer force-publishes a biography (draft → published) the
  yearly chapter cooldown should not block the update. Authors remain subject
  to chapter_cooldown_active; staff roles can republish at any time.
*/

CREATE OR REPLACE FUNCTION public.handle_biography_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (OLD.status IS DISTINCT FROM 'published') THEN

    IF COALESCE(OLD.chapters_count, 0) > 0
       AND OLD.next_chapter_available_at IS NOT NULL
       AND now() < OLD.next_chapter_available_at
       AND COALESCE(public.get_my_role(), 'user') NOT IN ('reviewer', 'admin', 'super_admin') THEN
      RAISE EXCEPTION 'chapter_cooldown_active'
        USING ERRCODE = 'check_violation';
    END IF;

    NEW.last_chapter_published_at := now();
    NEW.chapters_count := COALESCE(OLD.chapters_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$;
