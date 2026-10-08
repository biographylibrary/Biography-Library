import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb } from './helpers/fake-supabase';

const routeScreeningFailureToManualReview = vi.fn(async () => undefined);

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  routeScreeningFailureToManualReview: (...a: unknown[]) =>
    (routeScreeningFailureToManualReview as (...x: unknown[]) => Promise<unknown>)(...a),
}));

vi.mock('@/lib/server/moderation-register', () => ({
  writeModerationMessage: vi.fn(async () => undefined),
}));

import { writeModerationMessage } from '@/lib/server/moderation-register';
import {
  REVISION_SCREENING_COULD_NOT_RUN_MESSAGE,
  getLatestJob,
  interruptStaleJobs,
  startAnalysisJob,
  sweepStaleAnalysisJobs,
} from '@/lib/server/analysis-jobs';

describe('analysis-jobs', () => {
  const prevStale = process.env.ANALYSIS_JOB_STALE_MINUTES;
  const prevNode = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    delete process.env.ANALYSIS_JOB_STALE_MINUTES;
  });

  afterEach(() => {
    if (prevStale === undefined) delete process.env.ANALYSIS_JOB_STALE_MINUTES;
    else process.env.ANALYSIS_JOB_STALE_MINUTES = prevStale;
    if (prevNode === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
    else (process.env as Record<string, string | undefined>).NODE_ENV = prevNode;
  });

  it('due avvii insieme: uno solo parte', async () => {
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [],
    });
    let releases: Array<() => void> = [];
    const gate = () =>
      new Promise<unknown>((resolve) => {
        releases.push(() =>
          resolve({ result: 'published', screeningStatus: 'passed', isRescreen: false })
        );
      });

    const a = await startAnalysisJob(db.client, 'bio-1', 'screening', gate);
    const b = await startAnalysisJob(db.client, 'bio-1', 'screening', gate);
    expect(a.started).toBe(true);
    expect(b.started).toBe(false);
    expect(a.jobId).toBe(b.jobId);
    expect(db.tables.analysis_jobs.filter((j) => j.status === 'running')).toHaveLength(1);

    for (const r of releases) r();
    await vi.waitFor(() =>
      expect(db.tables.analysis_jobs.find((j) => j.id === a.jobId)?.status).toBe('done')
    );
  });

  it.each([
    [{ result: 'published', screeningStatus: 'passed', isRescreen: false }],
    [{ result: 'under_review', screeningDetail: 'flagged', isRescreen: false, flagCount: 2 }],
    [{ result: 'under_review', screeningDetail: 'ai_error', isRescreen: false }],
    [{ result: 'under_review', screeningDetail: 'parse_error', isRescreen: false }],
    [
      {
        result: 'under_review',
        screeningDetail: 'text_changed',
        message: 'text_changed_during_screening',
        isRescreen: false,
      },
    ],
    [
      {
        result: 'under_review',
        screeningDetail: 'incomplete',
        message: 'screening_incomplete',
        isRescreen: false,
      },
    ],
  ])('salva l\'esito %j come done', async (outcome) => {
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [],
    });
    const { jobId } = await startAnalysisJob(db.client, 'bio-1', 'screening', async () => outcome);
    await vi.waitFor(() =>
      expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.status).toBe('done')
    );
    expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.outcome).toEqual(outcome);
    expect(routeScreeningFailureToManualReview).not.toHaveBeenCalled();
  });

  it('eccezione → failed e instrada in coda umana se screening senza reportId', async () => {
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [],
    });
    const { jobId } = await startAnalysisJob(db.client, 'bio-1', 'screening', async () => {
      throw new Error('publish_failed');
    });
    await vi.waitFor(() =>
      expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.status).toBe('failed')
    );
    expect(routeScreeningFailureToManualReview).toHaveBeenCalledWith(
      expect.anything(),
      'bio-1',
      'failed'
    );
  });

  it('lavoro interrupted che poi termina non riscrive riga né richiama instradamento', async () => {
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [],
    });
    let release!: (v: unknown) => void;
    const slow = new Promise((resolve) => {
      release = resolve;
    });
    const { jobId } = await startAnalysisJob(db.client, 'bio-1', 'screening', () => slow);

    await db.client
      .from('analysis_jobs')
      .update({
        status: 'interrupted',
        finished_at: new Date().toISOString(),
        outcome: { error: 'interrupted' },
      })
      .eq('id', jobId)
      .eq('status', 'running');

    release({ result: 'published', screeningStatus: 'passed', isRescreen: false });
    await new Promise((r) => setTimeout(r, 20));

    expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.status).toBe('interrupted');
    expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.outcome).toEqual({
      error: 'interrupted',
    });
    // finishJob ha saltato la scrittura; nessun instradamento dal finish tardivo
    expect(routeScreeningFailureToManualReview).not.toHaveBeenCalled();
  });

  it('bonifica: scaduto → interrupted e instradamento coda umana', async () => {
    process.env.ANALYSIS_JOB_STALE_MINUTES = '1';
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [
        {
          id: 'stale-1',
          biography_id: 'bio-1',
          kind: 'screening',
          status: 'running',
          started_at: old,
          finished_at: null,
          outcome: null,
          context: {},
        },
      ],
    });
    const n = await interruptStaleJobs(db.client, 'bio-1', 'screening');
    expect(n).toBe(1);
    expect(db.tables.analysis_jobs[0].status).toBe('interrupted');
    expect(routeScreeningFailureToManualReview).toHaveBeenCalledWith(
      expect.anything(),
      'bio-1',
      'interrupted'
    );
  });

  it('bonifica: non tocca una scheda già spostata (instradamento no-op via claim)', async () => {
    process.env.ANALYSIS_JOB_STALE_MINUTES = '1';
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'published', ai_screening_status: 'passed' }],
      analysis_jobs: [
        {
          id: 'stale-2',
          biography_id: 'bio-1',
          kind: 'screening',
          status: 'running',
          started_at: old,
          finished_at: null,
          outcome: null,
          context: {},
        },
      ],
    });
    await interruptStaleJobs(db.client, 'bio-1', 'screening');
    expect(db.tables.analysis_jobs[0].status).toBe('interrupted');
    expect(routeScreeningFailureToManualReview).toHaveBeenCalledWith(
      expect.anything(),
      'bio-1',
      'interrupted'
    );
    expect(db.tables.biographies[0].status).toBe('published');
    expect(db.tables.biographies[0].ai_screening_status).toBe('passed');
  });

  it('bonifica correzione: messaggio interno, nessun rapporto nuovo', async () => {
    process.env.ANALYSIS_JOB_STALE_MINUTES = '1';
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'revision_pending_review', ai_screening_status: null }],
      analysis_jobs: [
        {
          id: 'stale-rev',
          biography_id: 'bio-1',
          kind: 'screening',
          status: 'running',
          started_at: old,
          finished_at: null,
          outcome: null,
          context: { reportId: 'r1', authorId: 'author-1' },
        },
      ],
    });
    await interruptStaleJobs(db.client, 'bio-1', 'screening');
    expect(writeModerationMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        reportId: 'r1',
        internal: true,
        message: REVISION_SCREENING_COULD_NOT_RUN_MESSAGE,
      })
    );
    expect(routeScreeningFailureToManualReview).not.toHaveBeenCalled();
    expect(db.tables.biographies[0].ai_screening_status).toBeNull();
  });

  it('lavoro correzione fallito: messaggio interno, nessun rapporto nuovo', async () => {
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'revision_pending_review', ai_screening_status: null }],
      analysis_jobs: [],
    });
    const { jobId } = await startAnalysisJob(
      db.client,
      'bio-1',
      'screening',
      async () => {
        throw new Error('revision boom');
      },
      { reportId: 'r1', authorId: 'author-1' }
    );
    await vi.waitFor(() =>
      expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.status).toBe('failed')
    );
    expect(routeScreeningFailureToManualReview).not.toHaveBeenCalled();
    expect(writeModerationMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ reportId: 'r1', internal: true })
    );
  });

  it('controllo finale fallito o interrotto: nessun rapporto', async () => {
    process.env.ANALYSIS_JOB_STALE_MINUTES = '1';
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'pdf_draft', ai_screening_status: null }],
      analysis_jobs: [
        {
          id: 'pre-stale',
          biography_id: 'bio-1',
          kind: 'preprint_check',
          status: 'running',
          started_at: old,
          finished_at: null,
          outcome: null,
          context: {},
        },
      ],
    });
    await interruptStaleJobs(db.client, 'bio-1', 'preprint_check');
    expect(routeScreeningFailureToManualReview).not.toHaveBeenCalled();

    const db2 = createFakeDb({
      biographies: [{ id: 'bio-2', status: 'pdf_draft' }],
      analysis_jobs: [],
    });
    const { jobId } = await startAnalysisJob(db2.client, 'bio-2', 'preprint_check', async () => {
      throw new Error('preprint boom');
    });
    await vi.waitFor(() =>
      expect(db2.tables.analysis_jobs.find((j) => j.id === jobId)?.status).toBe('failed')
    );
    expect(routeScreeningFailureToManualReview).not.toHaveBeenCalled();
  });

  it('startAnalysisJob bonifica prima dell\'inserimento', async () => {
    process.env.ANALYSIS_JOB_STALE_MINUTES = '1';
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [
        {
          id: 'blocker',
          biography_id: 'bio-1',
          kind: 'screening',
          status: 'running',
          started_at: old,
          finished_at: null,
          outcome: null,
          context: {},
        },
      ],
    });
    const { jobId, started } = await startAnalysisJob(db.client, 'bio-1', 'screening', async () => ({
      result: 'published',
      screeningStatus: 'passed',
      isRescreen: false,
    }));
    expect(started).toBe(true);
    expect(jobId).not.toBe('blocker');
    expect(db.tables.analysis_jobs.find((j) => j.id === 'blocker')?.status).toBe('interrupted');
  });

  it('getLatestJob esegue la bonifica', async () => {
    process.env.ANALYSIS_JOB_STALE_MINUTES = '1';
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [
        {
          id: 'stale-g',
          biography_id: 'bio-1',
          kind: 'screening',
          status: 'running',
          started_at: old,
          finished_at: null,
          outcome: null,
          context: {},
        },
      ],
    });
    const latest = await getLatestJob(db.client, 'bio-1', 'screening');
    expect(latest.status).toBe('interrupted');
  });

  it('sweepStaleAnalysisJobs interrompe i scaduti e non tocca i recenti', async () => {
    process.env.ANALYSIS_JOB_STALE_MINUTES = '1';
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const recent = new Date().toISOString();
    const db = createFakeDb({
      biographies: [
        { id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' },
        { id: 'bio-2', status: 'under_review', ai_screening_status: 'pending' },
      ],
      analysis_jobs: [
        {
          id: 'stale-a',
          biography_id: 'bio-1',
          kind: 'screening',
          status: 'running',
          started_at: old,
          finished_at: null,
          outcome: null,
          context: {},
        },
        {
          id: 'fresh-b',
          biography_id: 'bio-2',
          kind: 'screening',
          status: 'running',
          started_at: recent,
          finished_at: null,
          outcome: null,
          context: {},
        },
      ],
    });

    const n = await sweepStaleAnalysisJobs(db.client);
    expect(n).toBe(1);
    expect(db.tables.analysis_jobs.find((j) => j.id === 'stale-a')?.status).toBe('interrupted');
    expect(db.tables.analysis_jobs.find((j) => j.id === 'fresh-b')?.status).toBe('running');
  });
});
