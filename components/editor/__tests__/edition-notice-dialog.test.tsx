/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditionNoticeDialog } from '@/components/editor/edition-notice-dialog';
import { translations } from '@/lib/i18n/translations';

const fetchMock = vi.fn();

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

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  editionId: 'ed-1',
  showDrift: false,
  identicalSectionCount: 0,
  originalStatus: 'published' as string | null,
  missingBookStructureParts: [] as import('@/lib/edition-book-structure-reminder').BookStructureReminderPart[],
  onAligned: vi.fn(),
};

describe('EditionNoticeDialog', () => {
  it('always shows the manual-only paragraph and Got it', () => {
    const copy = translations.en.translate;
    render(<EditionNoticeDialog {...baseProps} missingBookStructureParts={[]} />);
    expect(screen.getByText(copy.noticeTitle)).toBeTruthy();
    expect(screen.getByText(copy.bannerManualOnly)).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.noticeUnderstood })).toBeTruthy();
    expect(screen.queryByText(copy.driftMessage)).toBeNull();
    expect(screen.queryByText(copy.originalUnpublishedNote)).toBeNull();
  });

  it('shows only the reminder paragraphs that apply', () => {
    const copy = translations.en.translate;
    render(
      <EditionNoticeDialog
        {...baseProps}
        showDrift
        identicalSectionCount={2}
        originalStatus="draft"
        missingBookStructureParts={['dedication']}
        missingPhotoCaptions={{ missing: 2, total: 5 }}
      />
    );
    expect(screen.getByText(copy.driftMessage)).toBeTruthy();
    expect(screen.getByText(copy.originalUnpublishedNote)).toBeTruthy();
    expect(screen.getByText(copy.identicalSections.replace('{count}', '2'))).toBeTruthy();
    expect(screen.getByText(/In the original these are filled in:/)).toBeTruthy();
    expect(
      screen.getByText(
        copy.photoCaptionsReminder.replace('{missing}', '2').replace('{total}', '5')
      )
    ).toBeTruthy();
  });

  it('nasconde il promemoria didascalie se non manca nulla', () => {
    const copy = translations.en.translate;
    render(
      <EditionNoticeDialog
        {...baseProps}
        missingPhotoCaptions={null}
      />
    );
    expect(screen.queryByText(/Photo captions still to translate/)).toBeNull();
    expect(screen.queryByText(copy.photoCaptionsReminder.replace('{missing}', '0').replace('{total}', '0'))).toBeNull();
  });

  it('closes on Got it via onOpenChange(false)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const copy = translations.en.translate;
    render(<EditionNoticeDialog {...baseProps} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: copy.noticeUnderstood }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('driftConfirm calls edition-aligned and onAligned', async () => {
    const user = userEvent.setup();
    const onAligned = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, originalVersionAt: '2026-10-01T00:00:00Z' }),
    });
    render(
      <EditionNoticeDialog {...baseProps} showDrift onAligned={onAligned} />
    );
    await user.click(
      screen.getByRole('button', { name: translations.en.translate.driftConfirm })
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/biography/edition-aligned',
        expect.objectContaining({ method: 'POST' })
      );
      expect(onAligned).toHaveBeenCalledWith('2026-10-01T00:00:00Z');
    });
  });

  it('book structure button closes the dialog and opens the panel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onOpenBookStructure = vi.fn();
    render(
      <EditionNoticeDialog
        {...baseProps}
        onOpenChange={onOpenChange}
        missingBookStructureParts={['preface']}
        onOpenBookStructure={onOpenBookStructure}
      />
    );
    await user.click(
      screen.getByRole('button', { name: translations.en.editor.bookStructureTitle })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onOpenBookStructure).toHaveBeenCalled();
  });

  it('il pulsante didascalie chiude il messaggio e apre il pannello', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onOpenPhotoCaptions = vi.fn();
    render(
      <EditionNoticeDialog
        {...baseProps}
        onOpenChange={onOpenChange}
        missingPhotoCaptions={{ missing: 2, total: 5 }}
        onOpenPhotoCaptions={onOpenPhotoCaptions}
      />
    );
    await user.click(
      screen.getByRole('button', { name: translations.en.photos.editionCaptionsTitle })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onOpenPhotoCaptions).toHaveBeenCalledTimes(1);
  });

  it('senza onOpenPhotoCaptions non c\'è il pulsante didascalie', () => {
    render(
      <EditionNoticeDialog
        {...baseProps}
        missingPhotoCaptions={{ missing: 2, total: 5 }}
      />
    );
    expect(
      screen.queryByRole('button', { name: translations.en.photos.editionCaptionsTitle })
    ).toBeNull();
    expect(
      screen.getByText(
        translations.en.translate.photoCaptionsReminder
          .replace('{missing}', '2')
          .replace('{total}', '5')
      )
    ).toBeTruthy();
  });
});
