/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { translations } from '@/lib/i18n/translations';

const replaceMock = vi.fn();
const pushMock = vi.fn();
const routerMock = { replace: replaceMock, push: pushMock };
const authState = {
  user: {
    id: 'u1',
    email: 'prova@example.com',
    user_metadata: { name: 'Maria Rossi' },
  } as {
    id: string;
    email: string;
    user_metadata: { name: string };
  } | null,
  loading: false,
  fontSize: 'normal' as const,
  setFontSize: vi.fn(),
  signOut: vi.fn(),
};

function biographiesQuery() {
  const result = {
    count: 1,
    data: { id: 'bio-1' },
    error: null,
  };
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.is = () => ({
    ...result,
    then: (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    order: self,
    limit: self,
    maybeSingle: async () => result,
  });
  chain.order = self;
  chain.limit = self;
  chain.maybeSingle = async () => result;
  return chain;
}

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'it',
    t: translations.it,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: authState.loading,
    fontSize: authState.fontSize,
    setFontSize: authState.setFontSize,
    signOut: authState.signOut,
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
}));

vi.mock('@/components/onboarding/OnboardingGateProvider', () => ({
  useOnboardingGate: () => ({
    refreshOnboarding: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => biographiesQuery(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/components/accessibility/font-size-control', () => ({
  FontSizeControl: () => <div data-testid="font-size-control" />,
}));

vi.mock('@/components/settings/delete-account-dialog', () => ({
  DeleteAccountDialog: () => <div data-testid="delete-account-dialog" />,
}));

vi.mock('@/lib/onboarding/onboarding-client', () => ({
  patchOnboarding: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

import SettingsPage from '@/app/settings/page';

beforeEach(() => {
  replaceMock.mockReset();
  authState.user = {
    id: 'u1',
    email: 'prova@example.com',
    user_metadata: { name: 'Maria Rossi' },
  };
  authState.loading = false;
  authState.fontSize = 'normal';
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SettingsPage i18n labels', () => {
  it('mostra le etichette italiane e non quelle inglesi fisse', async () => {
    await act(async () => {
      render(<SettingsPage />);
    });

    const a = translations.it.accountSettings;
    expect(screen.getByText(a.appearance)).toBeTruthy();
    expect(screen.getByText(a.fontSize)).toBeTruthy();
    expect(screen.getByText(a.account)).toBeTruthy();
    expect(screen.getByText(a.dangerZone)).toBeTruthy();
    expect(screen.getByText(a.fontSizeNormal)).toBeTruthy();

    expect(screen.queryByText('Appearance')).toBeNull();
    expect(screen.queryByText('Font size')).toBeNull();
    expect(screen.queryByText('Danger zone')).toBeNull();
    expect(screen.queryByText('Small (90%)')).toBeNull();
    expect(screen.queryByText('Extra-large (130%)')).toBeNull();
  });
});

describe('SettingsPage auth loading gate', () => {
  it('loading vero e user vuoto: router.replace non è chiamato, nemmeno dopo i timer', async () => {
    vi.useFakeTimers();
    authState.user = null;
    authState.loading = true;

    await act(async () => {
      render(<SettingsPage />);
    });
    expect(replaceMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(replaceMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('loading falso e user vuoto: router.replace(/login) una volta', async () => {
    authState.user = null;
    authState.loading = false;

    await act(async () => {
      render(<SettingsPage />);
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('loading falso e user presente: nessun replace e mostra il nome', async () => {
    authState.loading = false;

    await act(async () => {
      render(<SettingsPage />);
    });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText('Maria Rossi')).toBeTruthy();
  });
});
