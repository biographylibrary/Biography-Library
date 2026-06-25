'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { fetchOnboardingState, patchOnboarding } from '@/lib/onboarding/onboarding-client';
import type { Language } from '@/lib/i18n/translations';
import type { OnboardingProfileState } from '@/lib/onboarding/types';

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/terms-of-service',
  '/privacy-policy',
  '/cookie-policy',
  '/biographies',
  '/',
];

const ONBOARDING_EXEMPT = ['/onboarding', '/settings'];

type OnboardingGateContextValue = {
  onboardingState: OnboardingProfileState | null;
  refreshOnboarding: () => Promise<void>;
  languageGateResolved: boolean;
};

const OnboardingGateContext = createContext<OnboardingGateContextValue | null>(null);

export function useOnboardingGate() {
  const ctx = useContext(OnboardingGateContext);
  if (!ctx) {
    throw new Error('useOnboardingGate must be used within OnboardingGateProvider');
  }
  return ctx;
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function needsOnboardingRedirect(
  pathname: string,
  state: OnboardingProfileState | null
): boolean {
  if (!state) return false;
  if (state.onboarding_phase === 'completed') return false;
  if (state.onboarding_phase === 'tour') return false;
  if (pathname.startsWith('/onboarding')) return false;
  if (pathname.match(/^\/biography\/[^/]+\/edit/)) return false;
  if (ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p))) return false;
  if (isPublicPath(pathname)) return false;
  return state.onboarding_phase === 'wizard';
}

export function OnboardingGateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { syncLanguageFromProfile, isLoading: i18nLoading } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const [onboardingState, setOnboardingState] = useState<OnboardingProfileState | null>(null);
  const [languageGateResolved, setLanguageGateResolved] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const refreshOnboarding = useCallback(async () => {
    if (!user) {
      setOnboardingState(null);
      return;
    }
    const { data } = await fetchOnboardingState();
    if (data) setOnboardingState(data);
  }, [user]);

  useEffect(() => {
    if (authLoading || i18nLoading) return;
    if (!user) {
      setLanguageGateResolved(true);
      setBootstrapping(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: state } = await fetchOnboardingState();
      if (cancelled) return;

      if (state) {
        setOnboardingState(state);

        if (state.language) {
          syncLanguageFromProfile(state.language as Language);
        }

        if (!state.language_confirmed_at && state.language) {
          await patchOnboarding({
            action: 'confirm_language',
            language: state.language as Language,
          });
        }
      }

      setLanguageGateResolved(true);
      setBootstrapping(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, i18nLoading, syncLanguageFromProfile]);

  useEffect(() => {
    if (!user || !languageGateResolved || bootstrapping) return;
    if (!onboardingState) return;
    if (pathname.startsWith('/onboarding') && onboardingState.onboarding_phase === 'completed') {
      router.replace('/dashboard');
      return;
    }
    if (needsOnboardingRedirect(pathname, onboardingState)) {
      router.replace('/onboarding');
    }
  }, [user, languageGateResolved, bootstrapping, onboardingState, pathname, router]);

  const value = useMemo(
    () => ({
      onboardingState,
      refreshOnboarding,
      languageGateResolved,
    }),
    [onboardingState, refreshOnboarding, languageGateResolved]
  );

  const blockChildren =
    user && !languageGateResolved && !isPublicPath(pathname) && !bootstrapping;

  return (
    <OnboardingGateContext.Provider value={value}>
      {blockChildren ? (
        <div className="min-h-screen flex items-center justify-center bg-[#EDEBE7]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        children
      )}
    </OnboardingGateContext.Provider>
  );
}
