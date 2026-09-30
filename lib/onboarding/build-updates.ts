import {
  LEGAL_DECLARATION_VERSION,
  WIZARD_STEP_ORDER,
  type OnboardingPatchBody,
  type OnboardingProfileState,
  type WizardStep,
} from '@/lib/onboarding/types';

const BIOGRAPHY_TYPES = ['autobiography', 'memorial'] as const;
const WRITING_PATHS = ['sections', 'freeflow_import', 'publish_ready'] as const;
const LANGUAGES = ['en', 'it', 'fr', 'de'] as const;
const ALL_WIZARD_STEPS = ['biography_type', 'legal', 'details', 'path'] as const;

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function nextWizardStep(current: WizardStep | null): WizardStep {
  if (!current) return 'biography_type';
  const idx = WIZARD_STEP_ORDER.indexOf(current);
  return WIZARD_STEP_ORDER[Math.min(idx + 1, WIZARD_STEP_ORDER.length - 1)];
}

export type OnboardingUpdatesResult =
  | { ok: true; updates: Record<string, unknown> }
  | { ok: false; status: 400; error: string };

/**
 * Scritture sul profilo per ogni azione dell'onboarding. Puro: lo usano la rotta
 * PATCH /api/onboarding e i test. La data e la versione della dichiarazione
 * legale le fissa il server (`now`, LEGAL_DECLARATION_VERSION), mai il client, e
 * la scrittura la fa il ruolo di servizio (colonne riservate di profiles).
 */
export function buildOnboardingUpdates(
  state: OnboardingProfileState,
  body: OnboardingPatchBody,
  now: string
): OnboardingUpdatesResult {
  // I valori arrivano dal browser: si accetta solo l'elenco ammesso.
  if (
    (body.biographyType !== undefined && !isOneOf(BIOGRAPHY_TYPES, body.biographyType)) ||
    (body.writingPath !== undefined && !isOneOf(WRITING_PATHS, body.writingPath)) ||
    (body.wizardStep !== undefined && !isOneOf(ALL_WIZARD_STEPS, body.wizardStep)) ||
    (body.language !== undefined && !isOneOf(LANGUAGES, body.language))
  ) {
    return { ok: false, status: 400, error: 'Invalid value' };
  }

  const updates: Record<string, unknown> = {};

  switch (body.action) {
    case 'confirm_language': {
      if (state.language_confirmed_at) {
        break;
      }
      updates.language_confirmed_at = now;
      if (body.language) updates.language = body.language;
      break;
    }
    case 'advance_wizard': {
      if (body.biographyType) {
        updates.legal_declaration_type = body.biographyType;
      }
      if (body.wizardStep === 'legal' && body.biographyType) {
        updates.legal_declaration_accepted_at = now;
        updates.legal_declaration_version = LEGAL_DECLARATION_VERSION;
      }
      if (body.writingPath) {
        updates.onboarding_writing_path = body.writingPath;
      }
      const step = body.wizardStep ?? state.onboarding_wizard_step ?? 'biography_type';
      updates.onboarding_wizard_step = nextWizardStep(step);
      updates.onboarding_phase = 'wizard';
      updates.onboarding_skipped_at = null;
      break;
    }
    case 'skip': {
      if (state.onboarding_phase === 'wizard') {
        return { ok: false, status: 400, error: 'Wizard cannot be skipped' };
      }
      updates.onboarding_phase = 'skipped';
      updates.onboarding_skipped_at = now;
      break;
    }
    case 'resume': {
      updates.onboarding_phase = 'wizard';
      updates.onboarding_skipped_at = null;
      if (!state.onboarding_wizard_step) {
        updates.onboarding_wizard_step = 'biography_type';
      }
      break;
    }
    case 'complete_wizard': {
      updates.onboarding_phase = 'tour';
      if (body.writingPath) updates.onboarding_writing_path = body.writingPath;
      updates.onboarding_wizard_step = 'path';
      break;
    }
    case 'complete_tour': {
      updates.onboarding_phase = 'completed';
      updates.onboarding_completed_at = now;
      break;
    }
    case 'restart_intro': {
      updates.onboarding_phase = 'wizard';
      updates.onboarding_wizard_step = 'biography_type';
      updates.onboarding_skipped_at = null;
      updates.onboarding_completed_at = null;
      break;
    }
    case 'restart_tour': {
      updates.onboarding_phase = 'tour';
      updates.onboarding_skipped_at = null;
      updates.onboarding_completed_at = null;
      break;
    }
    default:
      if (body.wizardStep) {
        updates.onboarding_wizard_step = body.wizardStep;
        updates.onboarding_phase = 'wizard';
        updates.onboarding_skipped_at = null;
      }
      if (body.writingPath) updates.onboarding_writing_path = body.writingPath;
      if (body.biographyType) updates.legal_declaration_type = body.biographyType;
  }

  return { ok: true, updates };
}
