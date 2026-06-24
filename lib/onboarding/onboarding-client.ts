import { supabase } from '@/lib/supabase';
import type { OnboardingPatchBody, OnboardingProfileState } from './types';

export async function fetchOnboardingState(): Promise<{
  data: OnboardingProfileState | null;
  error: string | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: 'Not authenticated' };
  }

  const res = await fetch('/api/onboarding', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    return { data: null, error: json.error ?? 'Failed to load onboarding' };
  }
  return { data: json as OnboardingProfileState, error: null };
}

export async function patchOnboarding(body: OnboardingPatchBody): Promise<{
  data: OnboardingProfileState | null;
  error: string | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: 'Not authenticated' };
  }

  const res = await fetch('/api/onboarding', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    return { data: null, error: json.error ?? 'Failed to update onboarding' };
  }
  return { data: json as OnboardingProfileState, error: null };
}
