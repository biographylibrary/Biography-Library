/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { EditionBanner } from '@/components/editor/edition-banner';
import { translations } from '@/lib/i18n/translations';

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'en',
    t: translations.en,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('EditionBanner', () => {
  it('renders only the writing phrase and the open-original link', () => {
    const copy = translations.en.translate;
    const { container } = render(
      <EditionBanner languageTag="fr" originalId="orig-1" originalTitle="My Story" />
    );
    const expected = copy.bannerWriting
      .replace('{language}', 'French')
      .replace('{title}', 'My Story');
    expect(screen.getByText((_content, node) => node?.textContent === expected)).toBeTruthy();
    expect(screen.getByRole('link', { name: copy.bannerOpenOriginal })).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[data-radix-popper-content-wrapper]')).toBeNull();
    expect(screen.queryByText(copy.bannerManualOnly)).toBeNull();
    expect(screen.queryByText(copy.driftMessage)).toBeNull();
    expect(screen.queryByText(copy.originalUnpublishedNote)).toBeNull();
  });

  it('truncates only the title from sm breakpoint classes', () => {
    const longTitle =
      'A very long original biography title that should be truncated without cutting the writing phrase';
    const { container } = render(
      <EditionBanner languageTag="fr" originalId="orig-1" originalTitle={longTitle} />
    );
    const titleEl = screen.getByTitle(longTitle);
    expect(titleEl.className).toMatch(/sm:truncate/);
    expect(titleEl.textContent).toBe(longTitle);
    expect(within(container).getByRole('link')).toBeTruthy();
    expect(container.querySelector('.min-h-11')).toBeNull();
    expect(container.querySelector('.sm\\:max-h-11')).toBeTruthy();
  });
});
