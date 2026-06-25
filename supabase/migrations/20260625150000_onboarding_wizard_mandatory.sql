/*
  # Require onboarding wizard for users who skipped before biography creation

  Users who used "Skip for now" on the wizard (phase skipped, no biography)
  are moved back to the mandatory wizard flow.
*/

UPDATE public.profiles p
SET
  onboarding_phase = 'wizard',
  onboarding_skipped_at = NULL,
  onboarding_wizard_step = COALESCE(p.onboarding_wizard_step, 'biography_type')
WHERE p.onboarding_phase = 'skipped'
  AND NOT EXISTS (
    SELECT 1 FROM public.biographies b WHERE b.user_id = p.id
  );
