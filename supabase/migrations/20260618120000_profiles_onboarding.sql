/*
  # Onboarding state on profiles

  - language_confirmed_at: user completed language gate (auto or manual)
  - onboarding_phase: wizard | tour | completed | skipped
  - legal declaration audit fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'language_confirmed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN language_confirmed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_phase'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN onboarding_phase text NOT NULL DEFAULT 'wizard'
      CONSTRAINT profiles_onboarding_phase_check
        CHECK (onboarding_phase IN ('wizard', 'tour', 'completed', 'skipped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_wizard_step'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_wizard_step text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_writing_path'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_writing_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_skipped_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_skipped_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'legal_declaration_type'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN legal_declaration_type text
      CONSTRAINT profiles_legal_declaration_type_check
        CHECK (legal_declaration_type IS NULL OR legal_declaration_type IN ('autobiography', 'memorial'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'legal_declaration_accepted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN legal_declaration_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'legal_declaration_version'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN legal_declaration_version text DEFAULT '2026-06';
  END IF;
END $$;
