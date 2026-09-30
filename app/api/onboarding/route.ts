import { NextRequest, NextResponse } from 'next/server';
import { buildOnboardingUpdates } from '@/lib/onboarding/build-updates';
import type { OnboardingPatchBody, OnboardingProfileState } from '@/lib/onboarding/types';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { buildServiceClient } from '@/lib/server/service-client';

const PROFILE_FIELDS =
  'language, language_confirmed_at, onboarding_phase, onboarding_wizard_step, onboarding_writing_path, onboarding_skipped_at, onboarding_completed_at, legal_declaration_type, legal_declaration_accepted_at, legal_declaration_version';

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

  const built = buildOnboardingUpdates(
    current as OnboardingProfileState,
    body,
    new Date().toISOString()
  );
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }
  const updates = built.updates;

  // Scrive il servizio, filtrando sull'utente autenticato: la dichiarazione legale
  // (legal_declaration_*) è una colonna riservata al server, e il trigger guard di
  // profiles rifiuta la scrittura che arriva con la sessione dell'utente.
  const { data: updated, error: updateError } = await buildServiceClient()
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
