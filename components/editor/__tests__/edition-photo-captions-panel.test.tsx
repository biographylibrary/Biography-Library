/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditionPhotoCaptionsPanel } from '@/components/editor/EditionPhotoCaptionsPanel';
import { translations } from '@/lib/i18n/translations';

const upsertMock = vi.fn();
const createSignedUrlMock = vi.fn();

const photos = [
  {
    id: 'm1',
    file_url: 'https://example.com/storage/v1/object/public/biography-photos/u/a.jpg',
    caption: 'Originale uno',
    layout: 'full-page',
    display_order: 0,
  },
  {
    id: 'm2',
    file_url: 'https://example.com/storage/v1/object/public/biography-photos/u/b.jpg',
    caption: 'Originale due',
    layout: 'two-vertical',
    display_order: 1,
  },
];

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
    from: (table: string) => {
      if (table === 'biography_media') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                order: async () => ({ data: photos, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'biography_edition_captions') {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
          upsert: (...args: unknown[]) => upsertMock(...args),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrlMock(...args),
      }),
    },
  },
}));

beforeEach(() => {
  upsertMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
  createSignedUrlMock.mockResolvedValue({
    data: { signedUrl: 'https://signed.example/x.jpg' },
    error: null,
  });
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('EditionPhotoCaptionsPanel', () => {
  it('mostra le foto in ordine e la didascalia originale fuori dal campo', async () => {
    render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/Originale uno/)).toBeTruthy();
    });
    expect(screen.getByText(/Originale due/)).toBeTruthy();
    const inputs = screen.getAllByPlaceholderText(/Didascalia in/);
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('');
    expect(screen.queryByDisplayValue('Originale uno')).toBeNull();
    expect(screen.queryByText(/Upload|Carica|Elimina|layout|copia/i)).toBeNull();
  });

  it('scrive con upsert dopo 600 ms col biography_id dell\'edizione', async () => {
    render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
      />
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Didascalia in/)).toHaveLength(2));
    const input = screen.getAllByPlaceholderText(/Didascalia in/)[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hola' } });
    expect(upsertMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    const [payload, opts] = upsertMock.mock.calls[0];
    expect(payload.biography_id).toBe('ed-1');
    expect(payload.media_id).toBe('m1');
    expect(payload.caption).toBe('Hola');
    expect(opts).toEqual({ onConflict: 'biography_id,media_id' });
  });

  it('scrive subito all\'uscita dal campo', async () => {
    render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
      />
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Didascalia in/)).toHaveLength(2));
    const input = screen.getAllByPlaceholderText(/Didascalia in/)[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Pronto' } });
    fireEvent.blur(input);
    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    expect(upsertMock.mock.calls[0][0].caption).toBe('Pronto');
  });

  it('scrive allo smontaggio senza aspettare', async () => {
    const { unmount } = render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
      />
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Didascalia in/)).toHaveLength(2));
    const input = screen.getAllByPlaceholderText(/Didascalia in/)[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Flush' } });
    unmount();
    expect(upsertMock).toHaveBeenCalled();
    expect(upsertMock.mock.calls[0][0].caption).toBe('Flush');
  });

  it('non scrive se il testo non cambia', async () => {
    render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
      />
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Didascalia in/)).toHaveLength(2));
    const input = screen.getAllByPlaceholderText(/Didascalia in/)[0] as HTMLInputElement;
    fireEvent.blur(input);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('con upsert fallito mostra l\'errore e non perde il testo', async () => {
    upsertMock.mockResolvedValue({ error: { code: 'XX', message: 'fail' } });
    render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
      />
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Didascalia in/)).toHaveLength(2));
    const input = screen.getAllByPlaceholderText(/Didascalia in/)[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Resta' } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(screen.getByText(translations.it.photos.editionCaptionsSaveFailed)).toBeTruthy()
    );
    expect(input.value).toBe('Resta');
  });

  it('con 42501 mostra il messaggio di blocco', async () => {
    upsertMock.mockResolvedValue({
      error: { code: '42501', message: 'author_text_locked' },
    });
    render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
      />
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Didascalia in/)).toHaveLength(2));
    const input = screen.getAllByPlaceholderText(/Didascalia in/)[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Lock' } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(screen.getAllByText(translations.it.photos.editionCaptionsLocked).length).toBeGreaterThan(0)
    );
  });

  it('con readOnly i campi sono disattivati', async () => {
    render(
      <EditionPhotoCaptionsPanel
        editionId="ed-1"
        originalId="orig-1"
        recordLanguageTag="es"
        readOnly
        readOnlyReason={translations.it.photos.editionCaptionsReadOnly}
      />
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText(/Didascalia in/)).toHaveLength(2));
    for (const input of screen.getAllByPlaceholderText(/Didascalia in/)) {
      expect((input as HTMLInputElement).disabled).toBe(true);
    }
    expect(screen.getByText(translations.it.photos.editionCaptionsReadOnly)).toBeTruthy();
  });
});
