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
import { LanguageGateModal } from '@/components/onboarding/LanguageGateModal';
import {
  getBrowserLanguageTag,
  isBrowserEnglish,
  mapBrowserTagToAppLanguage,
  shouldShowLanguageGate,
} from '@/lib/i18n/detect-browser-language';
import { fetchOnboardingState, patchOnboarding } from '@/lib/onboarding/onboarding-client';
import type { Language } from '@/lib/i18n/translations';
import type { OnboardingProfileState } from '@/lib/onboarding/types';

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/terms-of-service',
  '/privacy-policy',
  '/cookie-policy',
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
  if (state.onboarding_phase === 'completed' || state.onboarding_phase === 'skipped') {
    return false;
  }
  if (pathname.startsWith('/onboarding')) return false;
  if (pathname.match(/^\/biography\/[^/]+\/edit/)) return false;
  if (ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p))) return false;
  if (isPublicPath(pathname)) return false;
  return state.onboarding_phase === 'wizard';
}

export function OnboardingGateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { setLanguage, isLoading: i18nLoading } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const [onboardingState, setOnboardingState] = useState<OnboardingProfileState | null>(null);
  const [languageGateResolved, setLanguageGateResolved] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [browserTag, setBrowserTag] = useState('en');
  const [initialLang, setInitialLang] = useState<Language>('en');
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
    setBrowserTag(getBrowserLanguageTag());
  }, []);

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

      if (state) setOnboardingState(state);

      const languageConfirmed = Boolean(state?.language_confirmed_at);
      const tag = getBrowserLanguageTag();
      const legacyWelcome = localStorage.getItem('hasSeenWelcome') === 'true';

      if (languageConfirmed || legacyWelcome) {
        if (legacyWelcome && !languageConfirmed) {
          const lang = (state?.language as Language) || mapBrowserTagToAppLanguage(tag) || 'en';
          await setLanguage(lang as Language);
          await patchOnboarding({ action: 'confirm_language', language: lang });
        }
        setLanguageGateResolved(true);
        setBootstrapping(false);
        return;
      }

      if (shouldShowLanguageGate(false, tag)) {
        const mapped = mapBrowserTagToAppLanguage(tag) ?? 'en';
        setInitialLang(mapped);
        setShowLanguageModal(true);
        setBootstrapping(false);
        return;
      }

      if (isBrowserEnglish(tag)) {
        await setLanguage('en');
        await patchOnboarding({ action: 'confirm_language', language: 'en' });
        localStorage.setItem('hasSeenWelcome', 'true');
        if (!cancelled) {
          setOnboardingState((prev) =>
            prev
              ? { ...prev, language_confirmed_at: new Date().toISOString(), language: 'en' }
              : prev
          );
        }
      }

      if (!cancelled) {
        setLanguageGateResolved(true);
        setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, i18nLoading, setLanguage]);

  useEffect(() => {
    if (!user || !languageGateResolved || bootstrapping) return;
    if (!onboardingState) return;
    if (needsOnboardingRedirect(pathname, onboardingState)) {
      router.replace('/onboarding');
    }
  }, [user, languageGateResolved, bootstrapping, onboardingState, pathname, router]);

  const handleLanguageConfirm = useCallback(
    async (lang: Language) => {
      await setLanguage(lang);
      await patchOnboarding({ action: 'confirm_language', language: lang });
      localStorage.setItem('hasSeenWelcome', 'true');
      setShowLanguageModal(false);
      setLanguageGateResolved(true);
      await refreshOnboarding();
    },
    [setLanguage, refreshOnboarding]
  );

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
      <LanguageGateModal
        open={showLanguageModal}
        browserTag={browserTag}
        initialSelection={initialLang}
        onConfirm={handleLanguageConfirm}
      />
    </OnboardingGateContext.Provider>
  );
}
