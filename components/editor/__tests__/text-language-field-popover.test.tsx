/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextLanguageField } from '@/components/editor/TextLanguageField';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('TextLanguageField Popover modal', () => {
  it('a elenco aperto dentro un Dialog nasconde il contenuto della finestra (aria-hidden)', async () => {
    const user = userEvent.setup();
    render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Lingua</DialogTitle>
          <div data-testid="dialog-body">
            <TextLanguageField value="it" onChange={() => {}} />
          </div>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', {
      name: translations.it.textLanguage.label,
    });
    await user.click(trigger);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(translations.it.textLanguage.searchPlaceholder)
      ).toBeTruthy();
    });

    const dialogContent = document.querySelector('[role="dialog"]');
    expect(dialogContent).toBeTruthy();
    // Con Popover modal Radix nasconde il resto (incluso il Dialog) alle tecnologie assistive.
    expect(dialogContent?.getAttribute('aria-hidden')).toBe('true');
  });
});
