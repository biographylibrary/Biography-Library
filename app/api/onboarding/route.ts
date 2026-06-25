import { NextRequest, NextResponse } from 'next/server';
import {
  LEGAL_DECLARATION_VERSION,
  type OnboardingPatchBody,
  type OnboardingProfileState,
  type WizardStep,
  WIZARD_STEP_ORDER,
} from '@/lib/onboarding/types';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';

const PROFILE_FIELDS =
  'language, language_confirmed_at, onboarding_phase, onboarding_wizard_step, onboarding_writing_path, onboarding_skipped_at, onboarding_completed_at, legal_declaration_type, legal_declaration_accepted_at, legal_declaration_version';

function nextWizardStep(current: WizardStep | null): WizardStep {
  if (!current) return 'biography_type';
  const idx = WIZARD_STEP_ORDER.indexOf(current);
  return WIZARD_STEP_ORDER[Math.min(idx + 1, WIZARD_STEP_ORDER.length - 1)];
}

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.anonClient
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as OnboardingProfileState);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: OnboardingPatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data: current, error: fetchError } = await auth.anonClient
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', auth.user.id)
    .maybeSingle();

  if (fetchError || !current) {
    return NextResponse.json({ error: fetchError?.message ?? 'Profile not found' }, { status: 500 });
  }

  const state = current as OnboardingProfileState;
  const updates: Record<string, unknown> = {};
  const now = new Date().toISOString();

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
      updates.onboarding_phase = 'skipped';
      updates.onboarding_skipped_at = now;
      break;
    }
    case 'resume': {
      updates.onboarding_phase = state.onboarding_wizard_step ? 'wizard' : 'tour';
      updates.onboarding_skipped_at = null;
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
      if (body.wizardStep) updates.onboarding_wizard_step = body.wizardStep;
      if (body.writingPath) updates.onboarding_writing_path = body.writingPath;
      if (body.biographyType) updates.legal_declaration_type = body.biographyType;
  }

  const { data: updated, error: updateError } = await auth.anonClient
    .from('profiles')
    .update(updates)
    .eq('id', auth.user.id)
    .select(PROFILE_FIELDS)
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated as OnboardingProfileState);
}
