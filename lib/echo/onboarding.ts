export type EchoOnboardingStep =
  | 'language'
  | 'welcome'
  | 'title'
  | 'privacy'
  | 'path'
  | 'terms'
  | 'complete';

export type EchoWritingPath = 'sections' | 'freeflow' | 'publish_only';

export interface EchoOnboardingState {
  step: EchoOnboardingStep;
  language?: string;
  biographyTitle?: string;
  privacy?: 'private' | 'link-only' | 'public';
  writingPath?: EchoWritingPath;
  termsAccepted?: boolean;
  completed?: boolean;
}

const STORAGE_KEY = 'echo_onboarding_state';

export function loadOnboardingState(): EchoOnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EchoOnboardingState) : null;
  } catch {
    return null;
  }
}

export function saveOnboardingState(state: EchoOnboardingState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('echo_onboarding_completed') === 'true';
}

export function markOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('echo_onboarding_completed', 'true');
  localStorage.removeItem(STORAGE_KEY);
}

export const ONBOARDING_STEP_ORDER: EchoOnboardingStep[] = [
  'language',
  'welcome',
  'title',
  'privacy',
  'path',
  'terms',
  'complete',
];

export function nextStep(current: EchoOnboardingStep): EchoOnboardingStep {
  const idx = ONBOARDING_STEP_ORDER.indexOf(current);
  return ONBOARDING_STEP_ORDER[Math.min(idx + 1, ONBOARDING_STEP_ORDER.length - 1)];
}
