/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { translations } from '@/lib/i18n/translations';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = { push: pushMock, replace: replaceMock };

let searchParams = new URLSearchParams();

const authState: {
  user: { id: string; email: string } | null;
  loading: boolean;
  profileReady: boolean;
  accountStatus: string | null;
  role: string | null;
  signIn: ReturnType<typeof vi.fn>;
} = {
  user: null,
  loading: false,
  profileReady: true,
  accountStatus: 'active',
  role: 'author',
  signIn: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParams,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: authState.loading,
    profileReady: authState.profileReady,
    accountStatus: authState.accountStatus,
    role: authState.role,
    signIn: authState.signIn,
  }),
}));

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'it',
    t: translations.it,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock('@/components/logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock('@/lib/beta-login-notice', () => ({
  markBetaLoginNotice: vi.fn(),
}));

import { LoginScreen } from '@/components/auth/LoginScreen';

const t = translations.it;

function resetAuth() {
  authState.user = null;
  authState.loading = false;
  authState.profileReady = true;
  authState.accountStatus = 'active';
  authState.role = 'author';
  authState.signIn = vi.fn();
}

async function submitLogin(email = 'user@example.com', password = 'secret') {
  fireEvent.change(screen.getByLabelText(t.auth.email), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(t.auth.password), { target: { value: password } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: t.auth.signIn }));
  });
}

beforeEach(() => {
  pushMock.mockReset();
  replaceMock.mockReset();
  searchParams = new URLSearchParams();
  resetAuth();
});

afterEach(() => {
  cleanup();
});

describe('LoginScreen', () => {
  it('dopo accesso riuscito con ?signedOut=1 reindirizza alla dashboard', async () => {
    searchParams = new URLSearchParams('signedOut=1');
    authState.signIn.mockResolvedValue({ error: null });

    const { rerender } = render(<LoginScreen />);
    await submitLogin();

    expect(authState.signIn).toHaveBeenCalledWith('user@example.com', 'secret');

    authState.user = { id: 'u1', email: 'user@example.com' };
    authState.accountStatus = 'active';
    authState.role = 'author';
    rerender(<LoginScreen />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('con ?signedOut=1 e utente già presente non reindirizza e mostra il modulo', async () => {
    searchParams = new URLSearchParams('signedOut=1');
    authState.user = { id: 'u1', email: 'user@example.com' };
    authState.accountStatus = 'active';
    authState.role = 'author';

    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: t.auth.signIn })).toBeTruthy();
    expect(screen.queryByText(t.auth.loggingIn)).toBeNull();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('dopo accesso riuscito con ?session_expired=1 reindirizza alla dashboard', async () => {
    searchParams = new URLSearchParams('session_expired=1');
    authState.signIn.mockResolvedValue({ error: null });

    const { rerender } = render(<LoginScreen />);
    await submitLogin();

    authState.user = { id: 'u1', email: 'user@example.com' };
    authState.accountStatus = 'active';
    authState.role = 'author';
    rerender(<LoginScreen />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('rispetta returnTo e waitlist dopo accesso con ?signedOut=1', async () => {
    searchParams = new URLSearchParams('signedOut=1&returnTo=/biographies');
    authState.signIn.mockResolvedValue({ error: null });

    const { rerender } = render(<LoginScreen />);
    await submitLogin();

    authState.user = { id: 'u1', email: 'user@example.com' };
    authState.accountStatus = 'active';
    authState.role = 'author';
    rerender(<LoginScreen />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/biographies');
    });

    cleanup();
    pushMock.mockReset();
    resetAuth();
    searchParams = new URLSearchParams('signedOut=1');
    authState.signIn.mockResolvedValue({ error: null });

    const second = render(<LoginScreen />);
    await submitLogin();

    authState.user = { id: 'u2', email: 'user@example.com' };
    authState.accountStatus = 'waitlist';
    authState.role = 'author';
    second.rerender(<LoginScreen />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/waitlist');
    });
  });

  it('senza parametri e utente già presente reindirizza alla dashboard', async () => {
    authState.user = { id: 'u1', email: 'user@example.com' };
    authState.accountStatus = 'active';
    authState.role = 'author';

    render(<LoginScreen />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('con errore di accesso non attiva signedInHere; con email non confermata va a verify-email', async () => {
    searchParams = new URLSearchParams('signedOut=1');
    authState.signIn.mockResolvedValue({ error: 'Credenziali non valide' });

    const { rerender } = render(<LoginScreen />);
    await submitLogin();

    expect(screen.getByText('Credenziali non valide')).toBeTruthy();
    expect(screen.getByRole('button', { name: t.auth.signIn })).toBeTruthy();
    expect((screen.getByRole('button', { name: t.auth.signIn }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    authState.user = { id: 'u1', email: 'user@example.com' };
    authState.accountStatus = 'active';
    authState.role = 'author';
    rerender(<LoginScreen />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(pushMock).not.toHaveBeenCalled();

    cleanup();
    pushMock.mockReset();
    resetAuth();
    searchParams = new URLSearchParams();
    authState.signIn.mockResolvedValue({ error: null, emailNotConfirmed: true });

    render(<LoginScreen />);
    await submitLogin('pending@example.com', 'secret');

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith(
        `/verify-email?email=${encodeURIComponent('pending@example.com')}`,
      );
    });
  });
});
