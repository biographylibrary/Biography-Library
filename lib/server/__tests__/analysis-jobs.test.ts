import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb } from './helpers/fake-supabase';
import {
  REVISION_SCREENING_COULD_NOT_RUN_MESSAGE,
  getLatestJob,
  interruptStaleJobs,
  startAnalysisJob,
} from '@/lib/server/analysis-jobs';

vi.mock('@/lib/server/moderation-register', () => ({
  writeModerationMessage: vi.fn(async () => undefined),
}));

import { writeModerationMessage } from '@/lib/server/moderation-register';

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
        releases.push(() => resolve({ result: 'published', screeningStatus: 'passed', isRescreen: false }));
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
    [{ result: 'under_review', screeningDetail: 'text_changed', message: 'text_changed_during_screening', isRescreen: false }],
    [{ result: 'under_review', screeningDetail: 'incomplete', message: 'screening_incomplete', isRescreen: false }],
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
  });

  it('eccezione → failed e ai_screening_status ai_error se ancora pending', async () => {
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
    expect(db.tables.biographies[0].ai_screening_status).toBe('ai_error');
    expect(db.tables.biographies[0].status).toBe('under_review');
  });

  it('lavoro interrupted che poi termina non riscrive riga né ai_screening_status', async () => {
    const db = createFakeDb({
      biographies: [{ id: 'bio-1', status: 'under_review', ai_screening_status: 'pending' }],
      analysis_jobs: [],
    });
    let release!: (v: unknown) => void;
    const slow = new Promise((resolve) => {
      release = resolve;
    });
    const { jobId } = await startAnalysisJob(db.client, 'bio-1', 'screening', () => slow);

    // Un'altra via chiude il lavoro (bonifica) mentre work è ancora in sospeso.
    await db.client
      .from('analysis_jobs')
      .update({
        status: 'interrupted',
        finished_at: new Date().toISOString(),
        outcome: { error: 'interrupted' },
      })
      .eq('id', jobId)
      .eq('status', 'running');
    await db.client
      .from('biographies')
      .update({ ai_screening_status: 'ai_error' })
      .eq('id', 'bio-1');

    release({ result: 'published', screeningStatus: 'passed', isRescreen: false });
    await new Promise((r) => setTimeout(r, 20));

    expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.status).toBe('interrupted');
    expect(db.tables.analysis_jobs.find((j) => j.id === jobId)?.outcome).toEqual({
      error: 'interrupted',
    });
    expect(db.tables.biographies[0].ai_screening_status).toBe('ai_error');
  });

  it('bonifica: scaduto → interrupted e ai_error solo se scheda ancora in corso', async () => {
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
    expect(db.tables.biographies[0].ai_screening_status).toBe('ai_error');
  });

  it('bonifica: non tocca una scheda già spostata da una persona', async () => {
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
    expect(db.tables.biographies[0].status).toBe('published');
    expect(db.tables.biographies[0].ai_screening_status).toBe('passed');
  });

  it('bonifica correzione: messaggio interno nel rapporto', async () => {
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
    expect(db.tables.biographies[0].ai_screening_status).toBeNull();
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
});
