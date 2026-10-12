/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageGateModal } from '@/components/onboarding/LanguageGateModal';
import { PhotoGalleryPanel } from '@/components/editor/PhotoGalleryPanel';
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [
              {
                id: 'p1',
                biography_id: 'bio-1',
                user_id: 'u1',
                file_url:
                  'https://example.com/storage/v1/object/public/biography-photos/u/uno.jpg',
                file_name: 'uno.jpg',
                caption: 'uno',
                layout: 'full-page',
                display_order: 0,
                created_at: '2026-01-01T00:00:00Z',
              },
              {
                id: 'p2',
                biography_id: 'bio-1',
                user_id: 'u1',
                file_url:
                  'https://example.com/storage/v1/object/public/biography-photos/u/due.jpg',
                file_name: 'due.jpg',
                caption: 'due',
                layout: 'two-vertical',
                display_order: 1,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: { signedUrl: 'https://signed.example/x.jpg' },
          error: null,
        }),
        remove: async () => ({ error: null }),
      }),
    },
  },
}));

vi.mock('@/lib/client/biography-photo-upload', () => ({
  PHOTO_UPLOAD_MAX_BYTES: 20 * 1024 * 1024,
  uploadBiographyPhoto: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe('choice cards: 1px a riposo, ring-1 se selezionato', () => {
  it('LanguageGateModal: non selezionato border+border-border senza border-2; selezionato border-primary ring-1', () => {
    render(
      <LanguageGateModal
        open
        browserTag="it"
        initialSelection="en"
        onConfirm={async () => {}}
      />
    );
    const buttons = screen.getAllByRole('button').filter((b) =>
      b.className.includes('rounded-lg')
    );
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    const selected = buttons.find((b) => b.className.includes('border-primary'));
    const unselected = buttons.find(
      (b) => b.className.includes('border-border') && !b.className.includes('border-primary')
    );
    expect(selected).toBeTruthy();
    expect(unselected).toBeTruthy();
    expect(selected!.className).toMatch(/\bborder-primary\b/);
    expect(selected!.className).toMatch(/\bring-1\b/);
    expect(selected!.className).not.toMatch(/\bborder-2\b/);
    expect(unselected!.className).toMatch(/\bborder\b/);
    expect(unselected!.className).toMatch(/\bborder-border\b/);
    expect(unselected!.className).not.toMatch(/\bborder-2\b/);
    expect(unselected!.className).not.toMatch(/\bring-1\b/);
  });

  it('PhotoGalleryPanel miniatura: non selezionata border-border; selezionata border-primary ring-1, senza border-2', async () => {
    const { container } = render(<PhotoGalleryPanel biographyId="bio-1" embedded />);
    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });
    const tiles = Array.from(container.querySelectorAll('.aspect-square')) as HTMLElement[];
    expect(tiles.length).toBe(2);
    const selected = tiles.find((t) => t.className.includes('border-primary'));
    const unselected = tiles.find((t) => !t.className.includes('border-primary'));
    expect(selected).toBeTruthy();
    expect(unselected).toBeTruthy();
    expect(selected!.className).toMatch(/\bborder-primary\b/);
    expect(selected!.className).toMatch(/\bring-1\b/);
    expect(selected!.className).toMatch(/\bring-primary\b/);
    expect(selected!.className).not.toMatch(/\bborder-2\b/);
    expect(unselected!.className).toMatch(/\bborder-border\b/);
    expect(unselected!.className).not.toMatch(/\bborder-2\b/);

    fireEvent.click(unselected!);
    const after = Array.from(container.querySelectorAll('.aspect-square')) as HTMLElement[];
    const newlySelected = after.find((t) => t.className.includes('border-primary'));
    expect(newlySelected!.className).toMatch(/\bring-1\b/);
    expect(newlySelected!.className).not.toMatch(/\bborder-2\b/);
  });
});
