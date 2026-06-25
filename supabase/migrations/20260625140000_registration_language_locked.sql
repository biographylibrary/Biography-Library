/*
  # Lock registration language at signup

  Copy signup language into profiles and mark language_confirmed_at immediately
  so post-login language gate is skipped and emails/onboarding stay consistent.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  signup_lang text;
BEGIN
  signup_lang := LOWER(LEFT(COALESCE(NEW.raw_user_meta_data->>'language', ''), 2));
  IF signup_lang NOT IN ('en', 'it', 'fr', 'de') THEN
    signup_lang := 'en';
  END IF;

  INSERT INTO public.profiles (id, email, name, language, language_confirmed_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    signup_lang,
    NOW()
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET language_confirmed_at = COALESCE(p.language_confirmed_at, u.created_at, NOW())
FROM auth.users u
WHERE p.id = u.id
  AND p.language_confirmed_at IS NULL
  AND p.language IN ('en', 'it', 'fr', 'de');
