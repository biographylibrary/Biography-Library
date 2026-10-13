/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';
import { translations } from '@/lib/i18n/translations';

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'it',
    t: translations.it,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

describe('ThemeToggle', () => {
  it('dopo il montaggio mostra l’etichetta italiana di nav.darkMode', async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });

    expect(screen.getByText(translations.it.nav.darkMode)).toBeTruthy();
    expect(screen.queryByText('Toggle theme')).toBeNull();
  });
});
