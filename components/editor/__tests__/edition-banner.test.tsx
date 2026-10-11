/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditionBanner } from '@/components/editor/edition-banner';
import type { BookStructureReminderPart } from '@/lib/edition-book-structure-reminder';
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token' } } }),
    },
  },
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

const baseProps = {
  languageTag: 'fr',
  originalId: 'orig-1',
  originalTitle: 'My Story',
  originalStatus: 'published' as string | null,
  showDrift: false,
  identicalSectionCount: 0,
  onAligned: vi.fn(),
  editionId: 'ed-1',
  missingBookStructureParts: [] as BookStructureReminderPart[],
};

afterEach(() => {
  cleanup();
});

describe('EditionBanner', () => {
  it('renders a single compact bar in the normal state', () => {
    const { container } = render(<EditionBanner {...baseProps} />);
    const copy = translations.en.translate;
    expect(
      screen.getByText(copy.bannerCompact.replace('{language}', 'French').replace('{title}', 'My Story'))
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: copy.bannerOpenOriginal })).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.howItWorks })).toBeTruthy();
    expect(screen.queryByText(copy.bannerManualOnly)).toBeNull();
    expect(screen.queryByText(/To translate:/)).toBeNull();
    expect(screen.queryByText(copy.driftMessage)).toBeNull();
    expect(screen.queryByText(copy.originalUnpublishedNote)).toBeNull();
    const bars = container.querySelectorAll('.border-brand-blue\\/40');
    expect(bars).toHaveLength(1);
  });

  it('shows reminders only when needed', () => {
    const copy = translations.en.translate;
    const onOpenBookStructure = vi.fn();
    render(
      <EditionBanner
        {...baseProps}
        originalStatus="draft"
        showDrift
        identicalSectionCount={2}
        missingBookStructureParts={['dedication', 'preface']}
        onOpenBookStructure={onOpenBookStructure}
      />
    );
    expect(screen.getByText(/To translate:/)).toBeTruthy();
    expect(screen.getByText(copy.driftMessage)).toBeTruthy();
    expect(screen.getByText(copy.originalUnpublishedNote)).toBeTruthy();
    expect(screen.getByText(copy.identicalSections.replace('{count}', '2'))).toBeTruthy();
    expect(screen.getByRole('button', { name: translations.en.editor.bookStructureTitle })).toBeTruthy();
  });

  it('opens how it works with the manual-only text', async () => {
    const user = userEvent.setup();
    const copy = translations.en.translate;
    render(<EditionBanner {...baseProps} />);
    await user.click(screen.getByRole('button', { name: copy.howItWorks }));
    expect(await screen.findByText(copy.bannerManualOnly)).toBeTruthy();
  });

  it('keeps a long title truncated without breaking the bar', () => {
    const longTitle =
      'A very long original biography title that should be truncated in the compact banner row without wrapping the layout into many lines';
    const { container } = render(
      <EditionBanner {...baseProps} originalTitle={longTitle} />
    );
    const label = screen.getByTitle(longTitle);
    expect(label.className).toMatch(/truncate/);
    expect(label.textContent).toContain(longTitle);
    expect(within(container).getByRole('link')).toBeTruthy();
    const bar = container.querySelector('.min-h-11');
    expect(bar).toBeTruthy();
    expect(bar?.className).toMatch(/sm:max-h-11/);
  });
});
