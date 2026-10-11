/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PhotoGalleryPanel } from '@/components/editor/PhotoGalleryPanel';
import { translations } from '@/lib/i18n/translations';
import { uploadBiographyPhoto } from '@/lib/client/biography-photo-upload';

const updateCalls: Array<{ caption?: string; layout?: string; id: string }> = [];
const createSignedUrlMock = vi.fn();

const photoUno = {
  id: 'p1',
  biography_id: 'bio-1',
  user_id: 'u1',
  file_url: 'https://example.com/storage/v1/object/public/biography-photos/u/uno.jpg',
  file_name: 'uno.jpg',
  caption: 'uno',
  layout: 'full-page',
  display_order: 0,
  created_at: '2026-01-01T00:00:00Z',
};

const photoDue = {
  id: 'p2',
  biography_id: 'bio-1',
  user_id: 'u1',
  file_url: 'https://example.com/storage/v1/object/public/biography-photos/u/due.jpg',
  file_name: 'due.jpg',
  caption: 'due',
  layout: 'two-vertical',
  display_order: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const coverRow = {
  id: 'c1',
  biography_id: 'bio-1',
  user_id: 'u1',
  file_url: 'https://example.com/storage/v1/object/public/biography-photos/u/cover.jpg',
  file_name: 'cover.jpg',
  caption: null,
  layout: 'cover',
  display_order: 0,
  created_at: '2026-01-01T00:00:00Z',
};

let mediaRows: Array<Record<string, unknown>> = [photoUno, photoDue, coverRow];

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'it',
    t: translations.it,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('@/lib/client/biography-photo-upload', () => ({
  PHOTO_UPLOAD_MAX_BYTES: 20 * 1024 * 1024,
  uploadBiographyPhoto: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'biography_media') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: mediaRows, error: null }),
          }),
        }),
        update: (payload: { caption?: string; layout?: string }) => ({
          eq: async (_col: string, id: string) => {
            updateCalls.push({ ...payload, id });
            const row = mediaRows.find((r) => r.id === id);
            if (row && typeof payload.caption === 'string') {
              row.caption = payload.caption;
            }
            return { error: null };
          },
        }),
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrlMock(...args),
        remove: async () => ({ error: null }),
      }),
    },
  },
}));

async function flushMicrotasks(times = 6) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function renderPanelReady() {
  const view = render(<PhotoGalleryPanel biographyId="bio-1" embedded />);
  await flushMicrotasks();
  expect(screen.getByPlaceholderText(translations.it.photos.captionPlaceholder)).toBeTruthy();
  return view;
}

function captionInput() {
  return screen.getByPlaceholderText(
    translations.it.photos.captionPlaceholder
  ) as HTMLInputElement;
}

function galleryTiles(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.aspect-square')) as HTMLElement[];
}

beforeEach(() => {
  updateCalls.length = 0;
  mediaRows = [
    { ...photoUno, caption: 'uno' },
    { ...photoDue, caption: 'due' },
    { ...coverRow },
  ];
  createSignedUrlMock.mockResolvedValue({
    data: { signedUrl: 'https://signed.example/x.jpg' },
    error: null,
  });
  vi.mocked(uploadBiographyPhoto).mockReset();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:preview'),
    revokeObjectURL: vi.fn(),
  });
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PhotoGalleryPanel captions (grid)', () => {
  it('cambio foto con didascalie diverse: nessuna scrittura e il campo segue la foto', async () => {
    const { container } = await renderPanelReady();
    expect(captionInput().value).toBe('uno');

    fireEvent.click(galleryTiles(container)[1]!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(0);
    expect(captionInput().value).toBe('due');

    fireEvent.click(galleryTiles(container)[0]!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(0);
    expect(captionInput().value).toBe('uno');
  });

  it('caricamento foto nuova dopo selezione con didascalia: campo vuoto e nessuna scrittura sulla nuova', async () => {
    const newRow = {
      id: 'p3',
      biography_id: 'bio-1',
      user_id: 'u1',
      file_url: 'https://example.com/storage/v1/object/public/biography-photos/u/nuova.jpg',
      file_name: 'nuova.jpg',
      caption: '',
      layout: 'full-page',
      display_order: 2,
      created_at: '2026-01-02T00:00:00Z',
    };
    vi.mocked(uploadBiographyPhoto).mockResolvedValue({
      ok: true,
      media: newRow,
      medias: [newRow],
    });

    const { container } = await renderPanelReady();
    expect(captionInput().value).toBe('uno');

    // Cover inputs come first in the DOM; the gallery input is last (uploadFooter).
    const fileInputs = container.querySelectorAll(
      'input[type="file"][accept="image/jpeg,image/png,image/webp"]'
    );
    const fileInput = fileInputs[fileInputs.length - 1] as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File(['x'], 'nuova.jpg', { type: 'image/jpeg' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await flushMicrotasks(12);

    expect(vi.mocked(uploadBiographyPhoto)).toHaveBeenCalled();
    expect(captionInput().value).toBe('');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateCalls.filter((c) => c.id === 'p3' && 'caption' in c)).toHaveLength(0);
  });

  it('scrivi e cambia foto: scrittura immediata sull\'id modificato, poi nessuna altra', async () => {
    const { container } = await renderPanelReady();
    fireEvent.change(captionInput(), { target: { value: 'modificata' } });
    fireEvent.click(galleryTiles(container)[1]!);

    const captionUpdates = updateCalls.filter((c) => 'caption' in c);
    expect(captionUpdates).toHaveLength(1);
    expect(captionUpdates[0]).toMatchObject({ id: 'p1', caption: 'modificata' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(1);
  });

  it('scrivi e blur: scrittura immediata, nessuna seconda dopo 2000 ms', async () => {
    await renderPanelReady();
    fireEvent.change(captionInput(), { target: { value: 'dopo blur' } });
    fireEvent.blur(captionInput());

    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({ id: 'p1', caption: 'dopo blur' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(1);
  });

  it('scrivi e smonta: scrittura immediata con il testo scritto', async () => {
    const { unmount } = await renderPanelReady();
    fireEvent.change(captionInput(), { target: { value: 'allo smontaggio' } });
    unmount();

    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({ id: 'p1', caption: 'allo smontaggio' });
  });

  it('percorso normale: debounce a 600 ms, poi blur non riscrive', async () => {
    await renderPanelReady();
    fireEvent.change(captionInput(), { target: { value: 'normale' } });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({ id: 'p1', caption: 'normale' });

    fireEvent.blur(captionInput());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(1);
  });

  it('blur su campo non modificato non scrive', async () => {
    await renderPanelReady();
    fireEvent.blur(captionInput());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateCalls.filter((c) => 'caption' in c)).toHaveLength(0);
  });
});
