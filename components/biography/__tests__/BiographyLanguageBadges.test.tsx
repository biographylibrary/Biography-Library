/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BiographyLanguageBadges } from '@/components/biography/BiographyLanguageBadges';

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    t: {
      publicBiographies: { langOriginal: 'Lingua originale' },
      textLanguage: { label: 'Lingua del testo' },
    },
  }),
}));

afterEach(() => {
  cleanup();
});

describe('BiographyLanguageBadges', () => {
  it('originale: etichetta langOriginal', () => {
    render(<BiographyLanguageBadges originalLanguage="it" isOriginal />);
    expect(screen.getByTitle('Lingua originale')).toBeTruthy();
    expect(screen.getByText(/Lingua originale/)).toBeTruthy();
  });

  it('edizione: etichetta textLanguage.label', () => {
    render(<BiographyLanguageBadges originalLanguage="en" isOriginal={false} />);
    expect(screen.getByTitle('Lingua del testo')).toBeTruthy();
    expect(screen.getByText(/Lingua del testo/)).toBeTruthy();
    expect(screen.queryByTitle('Lingua originale')).toBeNull();
  });

  it('prova di rottura: isOriginal false non usa langOriginal', () => {
    const { container } = render(
      <BiographyLanguageBadges originalLanguage="fr" isOriginal={false} />
    );
    expect(container.textContent).not.toContain('Lingua originale');
    expect(container.textContent).toContain('Lingua del testo');
  });
});
