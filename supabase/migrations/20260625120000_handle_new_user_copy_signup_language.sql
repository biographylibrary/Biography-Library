/*
  # Copy signup language into profiles on user creation

  Ensures profiles.language matches auth.users.raw_user_meta_data.language
  so transactional emails use the registration language even when the client
  profile upsert fails (e.g. email confirmation required, no session yet).
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

  INSERT INTO public.profiles (id, email, name, language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    signup_lang
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
