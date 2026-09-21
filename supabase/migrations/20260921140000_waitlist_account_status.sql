/*
  # Waitlist beta: account_status waitlist + grant timestamp

  New signups land on waitlist. Existing active/suspended rows are not
  rewritten. Staff are activated when a super admin assigns a staff role
  (application code). RLS already requires get_my_account_status() = 'active'
  for biography writes, so waitlist users cannot create biographies.
*/

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'suspended', 'waitlist'));

ALTER TABLE public.profiles
  ALTER COLUMN account_status SET DEFAULT 'waitlist';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS waitlist_granted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_waitlist_created
  ON public.profiles (created_at)
  WHERE account_status = 'waitlist';

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

  INSERT INTO public.profiles (id, email, name, language, language_confirmed_at, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    signup_lang,
    NOW(),
    'waitlist'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
