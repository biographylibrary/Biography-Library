import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb } from './helpers/fake-supabase';

const notifyAuthor = vi.fn(async () => undefined);
const notifyReviewer = vi.fn(async () => undefined);

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/server/email/publication-helpers', () => ({
  notifyAuthorPublicationEmail: (...a: unknown[]) =>
    (notifyAuthor as (...x: unknown[]) => Promise<unknown>)(...a),
  notifyReviewerAssignedEmail: (...a: unknown[]) =>
    (notifyReviewer as (...x: unknown[]) => Promise<unknown>)(...a),
}));
vi.mock('@/lib/agents/purge-agent-memory', () => ({
  purgeAgentMemoryForBiography: vi.fn(),
}));
vi.mock('@/lib/agents/screening/run-publication-screening', () => ({
  runPublicationScreening: vi.fn(),
}));

import {
  fetchOpenAiFlaggedReportForRescreen,
  routeScreeningFailureToManualReview,
} from '@/lib/server/review-submit-pipeline';

describe('routeScreeningFailureToManualReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('under_review pending: ai_error, rapporto screening, email all\'autore', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          user_id: 'author-1',
          status: 'under_review',
          ai_screening_status: 'pending',
          record_language_tag: 'it',
        },
      ],
      profiles: [{ id: 'rev-1', role: 'reviewer' }],
      moderation_reports: [],
    });

    await routeScreeningFailureToManualReview(db.client, 'bio-1', 'failed');

    expect(db.tables.biographies[0]).toMatchObject({
      status: 'under_review',
      ai_screening_status: 'ai_error',
    });
    expect(db.tables.moderation_reports).toHaveLength(1);
    expect(db.tables.moderation_reports[0]).toMatchObject({
      origin: 'screening',
      ai_violation_level: 0,
      status: 'assigned',
      assigned_to: 'rev-1',
    });
    expect(db.tables.moderation_reports[0].description as string).toMatch(/failed/);
    expect(notifyAuthor).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'author-1',
        templateId: 'publication_under_review',
      })
    );
    expect(notifyReviewer).toHaveBeenCalledTimes(1);
  });

  it('locked_pending_screening: passa a under_review', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          user_id: 'author-1',
          status: 'locked_pending_screening',
          ai_screening_status: 'pending',
          record_language_tag: 'en',
        },
      ],
      profiles: [],
      moderation_reports: [],
    });

    await routeScreeningFailureToManualReview(db.client, 'bio-1', 'interrupted');

    expect(db.tables.biographies[0]).toMatchObject({
      status: 'under_review',
      ai_screening_status: 'ai_error',
    });
    expect(db.tables.moderation_reports).toHaveLength(1);
    expect(db.tables.moderation_reports[0].description as string).toMatch(/interrupted/);
  });

  it('due chiamanti insieme: un solo rapporto', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          user_id: 'author-1',
          status: 'under_review',
          ai_screening_status: 'pending',
          record_language_tag: 'en',
        },
      ],
      profiles: [],
      moderation_reports: [],
    });

    await Promise.all([
      routeScreeningFailureToManualReview(db.client, 'bio-1', 'failed'),
      routeScreeningFailureToManualReview(db.client, 'bio-1', 'interrupted'),
    ]);

    expect(db.tables.moderation_reports).toHaveLength(1);
    expect(db.tables.biographies[0].ai_screening_status).toBe('ai_error');
  });

  it('scheda già fuori da pending: nessun rapporto', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'bio-1',
          user_id: 'author-1',
          status: 'published',
          ai_screening_status: 'passed',
          record_language_tag: 'en',
        },
      ],
      moderation_reports: [],
    });

    await routeScreeningFailureToManualReview(db.client, 'bio-1', 'failed');

    expect(db.tables.moderation_reports).toHaveLength(0);
    expect(db.tables.biographies[0]).toMatchObject({
      status: 'published',
      ai_screening_status: 'passed',
    });
  });

  it('se la creazione del rapporto fallisce: ai_error resta, non lancia', async () => {
    const db = createFakeDb(
      {
        biographies: [
          {
            id: 'bio-1',
            user_id: 'author-1',
            status: 'under_review',
            ai_screening_status: 'pending',
            record_language_tag: 'en',
          },
        ],
        moderation_reports: [],
      },
      {
        failInsert: (table) =>
          table === 'moderation_reports' ? { message: 'insert boom' } : null,
      }
    );

    await expect(
      routeScreeningFailureToManualReview(db.client, 'bio-1', 'start_failed')
    ).resolves.toBeUndefined();

    expect(db.tables.biographies[0].ai_screening_status).toBe('ai_error');
    expect(db.tables.moderation_reports).toHaveLength(0);
  });
});

describe('fetchOpenAiFlaggedReportForRescreen', () => {
  it('caso storico: rapporto aperto con passaggi segnalati e stato pending, trovato', async () => {
    const db = createFakeDb({
      biographies: [
        { id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' },
      ],
      moderation_reports: [
        {
          id: 'flagged-report',
          biography_id: 'bio-1',
          status: 'assigned',
          origin: 'screening',
          created_at: '2026-10-08T12:00:00Z',
          ai_analysis: {
            summary: '1 passage flagged',
            flagged_passages: [{ text: 'x', section_key: 'childhood', reason: 'r', level: 2 }],
          },
        },
      ],
    });

    expect(await fetchOpenAiFlaggedReportForRescreen(db.client, 'bio-1')).toEqual({
      id: 'flagged-report',
    });
  });
});
