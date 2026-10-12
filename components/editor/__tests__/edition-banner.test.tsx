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

  it('è una banda a tutta larghezza con filetto inferiore border-border/50', () => {
    const longTitle =
      'Una vita lunga e difficile raccontata dai figli, dai nipoti e da chi la conobbe davvero negli anni della guerra';
    const { container } = render(
      <EditionBanner languageTag="fr" originalId="orig-1" originalTitle={longTitle} />
    );
    const band = container.firstElementChild as HTMLElement | null;
    expect(band).toBeTruthy();
    expect(band?.className).toMatch(/\bborder-b\b/);
    expect(band?.className).toMatch(/border-border\/50/);
    expect(band?.className).toMatch(/\bpy-1\.5\b/);
    expect(band?.className).toMatch(/\bsm:py-2\b/);
    expect(band?.className).toMatch(/\bshrink-0\b/);
    expect(band?.className).not.toMatch(/\brounded-lg\b/);
    expect(band?.className).not.toMatch(/(?:^|\s)border(?:\s|$)/);
    expect(band?.className).not.toMatch(/\bmx-4\b/);
    expect(band?.className).not.toMatch(/\bmt-3\b/);
    expect(band?.className).not.toMatch(/\bmb-1\b/);

    const inner = band?.querySelector('.sm\\:max-h-11') ?? band?.children[0];
    expect(inner?.className).toMatch(/\bsm:max-h-11\b/);

    const phrase = band?.querySelector('p');
    expect(phrase?.className).toMatch(/\bline-clamp-2\b/);
    expect(phrase?.className).toMatch(/\bsm:line-clamp-none\b/);
    expect(phrase?.className).toMatch(/sm:(?:!)?flex\b/);
    expect(phrase?.className).toMatch(/\bsm:leading-5\b/);
    expect(phrase?.className).not.toMatch(/\bsm:leading-none\b/);
    expect(band?.className.split(/\s+/).some((c) => c.startsWith('bg-'))).toBe(false);

    const titleEl = screen.getByTitle(longTitle);
    expect(titleEl.className).toMatch(/sm:truncate/);
    expect(within(container).getByRole('link')).toBeTruthy();
  });
});
