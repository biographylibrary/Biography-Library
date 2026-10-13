import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb } from './helpers/fake-supabase';

const syncArchivePackage = vi.fn(async () => ({ deposited: true, version: 2 }));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/agents/purge-agent-memory', () => ({
  purgeAgentMemoryForBiography: vi.fn(async () => undefined),
}));
vi.mock('@/lib/server/email/publication-helpers', () => ({
  notifyAuthorPublicationEmail: vi.fn(async () => undefined),
  notifyReviewerAssignedEmail: vi.fn(),
}));
vi.mock('@/lib/server/um-id-registry', () => ({
  ensureUmIdFor: vi.fn(async () => ({ umIdCanonical: 'UM-1' })),
}));
vi.mock('@/lib/server/archive-package-store', () => ({
  syncArchivePackage: (...a: unknown[]) => syncArchivePackage(...(a as [])),
}));
vi.mock('@/lib/agents/screening/run-publication-screening', () => ({
  runPublicationScreening: vi.fn(async () => ({ passages: [], overall_severity: 0 })),
}));

import { runReviewSubmitScreening } from '@/lib/server/review-submit-pipeline';

const FINAL = 'Testo finale abbastanza lungo per lo screening.';

beforeEach(() => {
  syncArchivePackage.mockClear();
  syncArchivePackage.mockImplementation(async () => ({ deposited: true, version: 2 }));
});

describe('review-submit: deposito edizione', () => {
  function editionDb(opts: { publishedAt: string | null }) {
    return createFakeDb({
      biographies: [
        {
          id: 'orig',
          user_id: 'author-1',
          status: 'published',
          title: 'Originale',
          record_language_tag: 'it',
          final_version: FINAL,
          biography_mode: 'freeflow',
          content: {},
          published_at: '2026-09-01T00:00:00Z',
        },
        {
          id: 'bio-1',
          user_id: 'author-1',
          title: 'Traduzione',
          author_name: '',
          content: {},
          content_freeflow: null,
          record_language_tag: 'es',
          final_version: FINAL,
          biography_mode: 'freeflow',
          status: 'locked_pending_screening',
          biography_type: 'autobiography',
          published_at: opts.publishedAt,
          provisional_until: null,
          translation_of: 'orig',
          ai_screening_status: 'pending',
        },
      ],
    });
  }

  it('prima pubblicazione automatica di un\'edizione deposita edition_published sull\'originale', async () => {
    const db = editionDb({ publishedAt: null });
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    expect(syncArchivePackage).toHaveBeenCalledWith(
      expect.anything(),
      'orig',
      'edition_published'
    );
  });

  it('ripubblicazione automatica di un\'edizione (published_at già valorizzato) non deposita', async () => {
    const db = editionDb({ publishedAt: '2026-09-15T00:00:00Z' });
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    expect(syncArchivePackage).not.toHaveBeenCalled();
  });

  it('originale invariato: deposito publication, non edition_published', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          user_id: 'author-1',
          title: '',
          author_name: '',
          content: {},
          content_freeflow: null,
          record_language_tag: 'en',
          final_version: FINAL,
          biography_mode: 'freeflow',
          status: 'locked_pending_screening',
          biography_type: 'autobiography',
          published_at: null,
          provisional_until: null,
        },
      ],
    });
    await runReviewSubmitScreening(db.client, 'bio-1');
    expect(syncArchivePackage).toHaveBeenCalledWith(
      expect.anything(),
      'bio-1',
      'publication'
    );
  });

  it('deposito fallito non blocca la pubblicazione', async () => {
    syncArchivePackage.mockRejectedValueOnce(new Error('archive_boom'));
    const db = editionDb({ publishedAt: null });
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    expect(db.tables.biographies.find((b) => b.id === 'bio-1')?.status).toBe('published');
  });
});
