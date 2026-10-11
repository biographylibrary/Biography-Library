import { describe, expect, it } from 'vitest';
import { biographyHasCoverPhoto } from '@/lib/server/edition-cover-check';
import { createFakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

describe('biographyHasCoverPhoto', () => {
  it('originale con cover → true', async () => {
    const db = createFakeDb({
      biographies: [{ id: 'orig-1', translation_of: null }],
      biography_media: [{ id: 'm1', biography_id: 'orig-1', layout: 'cover' }],
    });
    expect(await biographyHasCoverPhoto(db.client, 'orig-1')).toBe(true);
  });

  it('originale senza cover → false', async () => {
    const db = createFakeDb({
      biographies: [{ id: 'orig-1', translation_of: null }],
      biography_media: [{ id: 'm1', biography_id: 'orig-1', layout: 'full-page' }],
    });
    expect(await biographyHasCoverPhoto(db.client, 'orig-1')).toBe(false);
  });

  it('edizione: usa la cover dell\'originale (cover_a5 conta)', async () => {
    const db = createFakeDb({
      biographies: [
        { id: 'orig-1', translation_of: null },
        { id: 'ed-1', translation_of: 'orig-1' },
      ],
      biography_media: [{ id: 'm1', biography_id: 'orig-1', layout: 'cover_a5' }],
    });
    expect(await biographyHasCoverPhoto(db.client, 'ed-1')).toBe(true);
  });

  it('edizione il cui originale non ha cover → false (anche se l\'edizione ha una cover propria)', async () => {
    const db = createFakeDb({
      biographies: [
        { id: 'orig-1', translation_of: null },
        { id: 'ed-1', translation_of: 'orig-1' },
      ],
      biography_media: [{ id: 'm1', biography_id: 'ed-1', layout: 'cover' }],
    });
    expect(await biographyHasCoverPhoto(db.client, 'ed-1')).toBe(false);
  });
});
