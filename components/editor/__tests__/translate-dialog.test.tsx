/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslateDialog } from '@/components/editor/translate-dialog';
import { translations } from '@/lib/i18n/translations';

const fromMock = vi.fn();

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
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/editor/TextLanguageField', () => ({
  TextLanguageField: ({
    value,
    onChange,
    allowedBases,
    disabled,
  }: {
    value: string | null;
    onChange: (tag: string) => void;
    allowedBases?: readonly string[];
    disabled?: boolean;
  }) => (
    <select
      aria-label="Language"
      data-testid="language-field"
      disabled={disabled}
      value={value ?? ''}
      onChange={(event) => {
        if (event.target.value) onChange(event.target.value);
      }}
    >
      <option value="">—</option>
      {(allowedBases ?? []).map((base) => (
        <option key={base} value={base}>
          {base}
        </option>
      ))}
    </select>
  ),
}));

function editionQuery(
  rows: Array<{
    id?: string;
    record_language_tag: string | null;
    status?: string;
    original_version_at?: string | null;
    title?: string | null;
  }> = []
) {
  return {
    select: () => ({
      eq: () => ({
        order: async () => ({ data: rows, error: null }),
      }),
    }),
  };
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  originalId: 'orig-1',
  originalStatus: 'published',
  originalLanguageTag: 'it',
  originalTitle: 'Storia',
  originalRevisedAt: null,
  originalPublishedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => editionQuery([]));
});

afterEach(() => {
  cleanup();
});

describe('TranslateDialog', () => {
  it('starts with no language selected and create disabled', async () => {
    const copy = translations.en.translate;
    render(<TranslateDialog {...defaultProps} />);
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });
    const field = screen.getByTestId('language-field') as HTMLSelectElement;
    expect(field.value).toBe('');
    expect((screen.getByRole('button', { name: copy.create }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('enables create after a language is chosen', async () => {
    const user = userEvent.setup();
    const copy = translations.en.translate;
    render(<TranslateDialog {...defaultProps} />);
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });
    await user.selectOptions(screen.getByTestId('language-field'), 'fr');
    expect((screen.getByRole('button', { name: copy.create }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it('clears selection when the chosen language becomes occupied', async () => {
    const user = userEvent.setup();
    const copy = translations.en.translate;
    const { rerender } = render(<TranslateDialog {...defaultProps} />);
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });
    await user.selectOptions(screen.getByTestId('language-field'), 'fr');
    expect((screen.getByTestId('language-field') as HTMLSelectElement).value).toBe('fr');
    expect((screen.getByRole('button', { name: copy.create }) as HTMLButtonElement).disabled).toBe(
      false
    );

    // Original language becomes French → base "fr" is occupied → selection must clear.
    rerender(<TranslateDialog {...defaultProps} originalLanguageTag="fr" />);
    await waitFor(() => {
      expect((screen.getByTestId('language-field') as HTMLSelectElement).value).toBe('');
    });
    expect((screen.getByRole('button', { name: copy.create }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });
});
