/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { translations } from '@/lib/i18n/translations';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { RegisterForm } from '@/components/auth/RegisterForm';
import ResetPasswordPage from '@/app/reset-password/page';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = { push: pushMock, replace: replaceMock };

const signUpMock = vi.fn();
const updateUserMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    profileReady: true,
    accountStatus: null,
    role: null,
    signUp: signUpMock,
    signOut: vi.fn(),
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resend: vi.fn(),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
    },
  },
}));

vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock('@/components/logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

const t = translations.it;

beforeEach(() => {
  pushMock.mockReset();
  replaceMock.mockReset();
  signUpMock.mockReset();
  updateUserMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('PasswordRequirements component', () => {
  it('mostra i cinque requisiti con cerchio vuoto/spunta e aggiorna la riga aria-live="polite"', () => {
    const { rerender } = render(<PasswordRequirements password="abcdefghij1" />);

    expect(screen.getByTestId('password-req-minLength').getAttribute('data-met')).toBe('true');
    expect(screen.getByTestId('password-req-lowercase').getAttribute('data-met')).toBe('true');
    expect(screen.getByTestId('password-req-digit').getAttribute('data-met')).toBe('true');
    expect(screen.getByTestId('password-req-uppercase').getAttribute('data-met')).toBe('false');
    expect(screen.getByTestId('password-req-symbol').getAttribute('data-met')).toBe('false');

    expect(screen.getByTestId('password-req-icon-met-minLength')).toBeTruthy();
    expect(screen.getByTestId('password-req-icon-unmet-uppercase')).toBeTruthy();

    const status = screen.getByTestId('password-requirements-status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe(
      'Manca: una lettera maiuscola e un simbolo (per esempio ! ? # %)'
    );

    rerender(<PasswordRequirements password="Password123!" />);

    expect(screen.getByTestId('password-req-uppercase').getAttribute('data-met')).toBe('true');
    expect(screen.getByTestId('password-req-symbol').getAttribute('data-met')).toBe('true');
    expect(screen.getByTestId('password-requirements-status').textContent).toBe(
      t.auth.passwordValid
    );
  });
});

describe('RegisterForm — regole password, mostra/nascondi e weak_password', () => {
  it('mostra i requisiti alla messa a fuoco, ha autoComplete="new-password", mostra/nascondi e blocca invio con messaggio dei requisiti mancanti', async () => {
    render(<RegisterForm embedded />);

    const pwdInput = screen.getByLabelText(t.auth.password) as HTMLInputElement;
    const confirmInput = screen.getByLabelText(t.auth.confirmPassword) as HTMLInputElement;
    expect(pwdInput.getAttribute('autoComplete')).toBe('new-password');
    expect(confirmInput.getAttribute('autoComplete')).toBe('new-password');
    expect(pwdInput.type).toBe('password');

    fireEvent.focus(pwdInput);
    expect(screen.getByTestId('password-requirements')).toBeTruthy();

    const toggleBtn = screen.getByTestId('toggle-password-visibility');
    expect(toggleBtn.getAttribute('aria-label')).toBe(t.auth.showPassword);
    fireEvent.click(toggleBtn);
    expect(pwdInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe(t.auth.hidePassword);

    fireEvent.change(screen.getByLabelText(t.auth.email), {
      target: { value: 'anna@example.com' },
    });
    fireEvent.change(pwdInput, { target: { value: 'abcdefghij1' } });
    fireEvent.change(confirmInput, { target: { value: 'abcdefghij1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.auth.createAccount }));
    });

    expect(signUpMock).not.toHaveBeenCalled();
    expect(
      screen.getAllByText('Manca: una lettera maiuscola e un simbolo (per esempio ! ? # %)')
        .length
    ).toBeGreaterThanOrEqual(2);
  });

  it('mostra il messaggio tradotto quando Supabase restituisce weak_password con reason pwned', async () => {
    signUpMock.mockResolvedValue({
      error: 'Password is known to be weak and easy to guess, please choose a different one.',
      reasons: ['pwned'],
      emailConfirmRequired: false,
    });

    render(<RegisterForm embedded />);

    fireEvent.change(screen.getByLabelText(t.auth.email), {
      target: { value: 'anna@example.com' },
    });
    fireEvent.change(screen.getByLabelText(t.auth.password), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText(t.auth.confirmPassword), {
      target: { value: 'Password123!' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.auth.createAccount }));
    });

    expect(signUpMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(t.auth.passwordPwned)).toBeTruthy();
    expect(screen.queryByText(/known to be weak/i)).toBeNull();
  });
});

describe('ResetPasswordPage — regole password e weak_password', () => {
  it('blocca invio se mancano requisiti e mappa weak_password (pwned / characters) nella lingua UI', async () => {
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(t.auth.newPassword)).toBeTruthy();
    });

    const pwdInput = screen.getByLabelText(t.auth.newPassword) as HTMLInputElement;
    const confirmInput = screen.getByLabelText(t.auth.confirmNewPassword) as HTMLInputElement;
    expect(pwdInput.getAttribute('autoComplete')).toBe('new-password');
    expect(confirmInput.getAttribute('autoComplete')).toBe('new-password');

    fireEvent.change(pwdInput, { target: { value: 'Password123€' } });
    fireEvent.change(confirmInput, { target: { value: 'Password123€' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.auth.resetPasswordButton }));
    });

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(
      screen.getAllByText('Manca: un simbolo (per esempio ! ? # %)').length
    ).toBeGreaterThanOrEqual(2);

    updateUserMock.mockResolvedValue({
      data: { user: null },
      error: {
        name: 'AuthWeakPasswordError',
        code: 'weak_password',
        message: 'Password is known to be weak and easy to guess, please choose a different one.',
        reasons: ['pwned'],
      },
    });

    fireEvent.change(pwdInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmInput, { target: { value: 'Password123!' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.auth.resetPasswordButton }));
    });

    expect(updateUserMock).toHaveBeenCalledWith({ password: 'Password123!' });
    expect(screen.getByText(t.auth.passwordPwned)).toBeTruthy();
    expect(screen.queryByText(/known to be weak/i)).toBeNull();
  });
});
