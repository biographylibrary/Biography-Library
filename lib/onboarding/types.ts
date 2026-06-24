export type OnboardingPhase = 'wizard' | 'tour' | 'completed' | 'skipped';

export type WizardStep = 'biography_type' | 'legal' | 'details' | 'path';

export type WritingPath = 'sections' | 'freeflow_import' | 'publish_ready';

export type BiographyTypeChoice = 'autobiography' | 'memorial';

export const WIZARD_STEP_ORDER: WizardStep[] = [
  'biography_type',
  'legal',
  'details',
  'path',
];

export const LEGAL_DECLARATION_VERSION = '2026-06';

export interface OnboardingProfileState {
  language: string;
  language_confirmed_at: string | null;
  onboarding_phase: OnboardingPhase;
  onboarding_wizard_step: WizardStep | null;
  onboarding_writing_path: WritingPath | null;
  onboarding_skipped_at: string | null;
  onboarding_completed_at: string | null;
  legal_declaration_type: BiographyTypeChoice | null;
  legal_declaration_accepted_at: string | null;
  legal_declaration_version: string | null;
}

export interface OnboardingPatchBody {
  action?:
    | 'advance_wizard'
    | 'skip'
    | 'resume'
    | 'complete_wizard'
    | 'complete_tour'
    | 'confirm_language'
    | 'restart_intro'
    | 'restart_tour';
  wizardStep?: WizardStep;
  biographyType?: BiographyTypeChoice;
  writingPath?: WritingPath;
  language?: string;
}
