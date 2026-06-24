-- Email idempotency timestamps for welcome + engagement emails

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS chapter_available_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_draft_reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.reset_biography_engagement_email_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.next_chapter_available_at IS DISTINCT FROM OLD.next_chapter_available_at THEN
      NEW.chapter_available_email_sent_at := NULL;
    END IF;

    IF OLD.status = 'pdf_draft' AND NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.pdf_draft_reminder_sent_at := NULL;
    END IF;

    IF NEW.status = 'pdf_draft'
       AND OLD.status IS DISTINCT FROM 'pdf_draft'
       AND NEW.pdf_draft_started_at IS DISTINCT FROM OLD.pdf_draft_started_at THEN
      NEW.pdf_draft_reminder_sent_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_biography_engagement_email_flags ON public.biographies;

CREATE TRIGGER trg_reset_biography_engagement_email_flags
  BEFORE UPDATE ON public.biographies
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_biography_engagement_email_flags();
