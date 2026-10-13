/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { translations } from '@/lib/i18n/translations';
import ErrorPage from '@/app/error';

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'it',
    t: translations.it,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { critical: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

describe('app/error', () => {
  it('mostra i testi italiani e non «Something went wrong»', () => {
    const error = Object.assign(new Error('boom'), { digest: 'd1' });
    render(<ErrorPage error={error} reset={() => {}} />);

    expect(screen.getByText(translations.it.errors.title)).toBeTruthy();
    expect(screen.getByText(translations.it.errors.description)).toBeTruthy();
    expect(screen.getByText(translations.it.errors.tryAgain)).toBeTruthy();
    expect(screen.getByText(translations.it.errors.goToDashboard)).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });
});
