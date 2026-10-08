import {
  analysisJobStaleMinutes,
  type AnalysisJobKind,
  type AnalysisJobStatus,
} from '@/lib/analysis-job-constants';
import { writeModerationMessage } from '@/lib/server/moderation-register';
import type { AnyClient } from '@/lib/server/service-client';

/** Messaggio interno uguale a screenRevisionAndAttach quando lo screening non gira. */
export const REVISION_SCREENING_COULD_NOT_RUN_MESSAGE =
  'Automatic screening could not run on the corrected text. Run the screening again, or publish with the forced publication (which leaves a trace).';

export type AnalysisJobContext = {
  reportId?: string | null;
  authorId?: string | null;
};

export type AnalysisJobRow = {
  id: string;
  biography_id: string;
  kind: AnalysisJobKind;
  status: AnalysisJobStatus;
  started_at: string;
  finished_at: string | null;
  outcome: unknown;
  context: AnalysisJobContext;
};

export type ScreeningJobOutcome =
  | { result: 'published'; screeningStatus: 'passed'; isRescreen: boolean }
  | {
      result: 'under_review';
      message?: string;
      isRescreen: boolean;
      screeningDetail?: 'parse_error' | 'ai_error' | 'flagged' | 'text_changed' | 'incomplete';
      flagCount?: number;
    };

export type PreprintJobOutcome =
  | { feedback: Record<string, unknown> }
  | { error: string; message?: string };

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '23505') return true;
  const msg = error.message ?? '';
  return msg.includes('23505') || /duplicate key|unique constraint/i.test(msg);
}

/**
 * Porta `ai_screening_status` a `ai_error` solo se la scheda è ancora in
 * under_review / locked_pending_screening con pending (es. lavoro fallito
 * o avvio del job fallito dopo il cambio di stato).
 */
export async function applyAiErrorIfStillPending(
  client: AnyClient,
  biographyId: string,
  kind: AnalysisJobKind = 'screening'
): Promise<void> {
  if (kind !== 'screening') return;
  const { data: bio } = await client
    .from('biographies')
    .select('status, ai_screening_status')
    .eq('id', biographyId)
    .maybeSingle();
  const row = bio as { status?: string; ai_screening_status?: string } | null;
  if (!row) return;
  const statusOk =
    row.status === 'under_review' || row.status === 'locked_pending_screening';
  if (!statusOk || row.ai_screening_status !== 'pending') return;
  await client
    .from('biographies')
    .update({ ai_screening_status: 'ai_error' })
    .eq('id', biographyId)
    .eq('status', row.status)
    .eq('ai_screening_status', 'pending');
}

async function notifyRevisionInterrupted(
  client: AnyClient,
  context: AnalysisJobContext
): Promise<void> {
  const reportId = context.reportId;
  const senderId = context.authorId;
  if (!reportId || !senderId) return;
  try {
    await writeModerationMessage(client, {
      reportId,
      senderId,
      internal: true,
      message: REVISION_SCREENING_COULD_NOT_RUN_MESSAGE,
    });
  } catch (err) {
    console.error('[analysis-jobs] revision interrupt message failed', err);
  }
}

/**
 * Marca 'interrupted' i lavori 'running' più vecchi della soglia per (bio, kind).
 * Se la scrittura condizionata non tocca righe, non fa altro.
 */
export async function interruptStaleJobs(
  client: AnyClient,
  biographyId: string,
  kind: AnalysisJobKind
): Promise<number> {
  const cutoff = new Date(Date.now() - analysisJobStaleMinutes() * 60_000).toISOString();
  const { data: stale } = await client
    .from('analysis_jobs')
    .select('id, context')
    .eq('biography_id', biographyId)
    .eq('kind', kind)
    .eq('status', 'running')
    .lt('started_at', cutoff);

  const rows = (stale as Array<{ id: string; context?: AnalysisJobContext }> | null) ?? [];
  let n = 0;
  for (const row of rows) {
    const finishedAt = new Date().toISOString();
    const { data: updated } = await client
      .from('analysis_jobs')
      .update({
        status: 'interrupted',
        finished_at: finishedAt,
        outcome: { error: 'interrupted', message: 'Job exceeded stale threshold' },
      })
      .eq('id', row.id)
      .eq('status', 'running')
      .select('id');
    if (!updated || (updated as unknown[]).length === 0) {
      console.warn('[analysis-jobs] interrupt skipped — job already closed', row.id);
      continue;
    }
    n += 1;
    await applyAiErrorIfStillPending(client, biographyId, kind);
    const ctx = (row.context ?? {}) as AnalysisJobContext;
    if (kind === 'screening' && ctx.reportId) {
      await notifyRevisionInterrupted(client, ctx);
    }
  }
  return n;
}

async function findRunningJob(
  client: AnyClient,
  biographyId: string,
  kind: AnalysisJobKind
): Promise<string | null> {
  const { data } = await client
    .from('analysis_jobs')
    .select('id')
    .eq('biography_id', biographyId)
    .eq('kind', kind)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function finishJob(
  client: AnyClient,
  jobId: string,
  biographyId: string,
  kind: AnalysisJobKind,
  status: 'done' | 'failed',
  outcome: unknown,
  touchAiErrorOnFail: boolean
): Promise<void> {
  const finishedAt = new Date().toISOString();
  const { data: updated } = await client
    .from('analysis_jobs')
    .update({ status, finished_at: finishedAt, outcome })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id');
  if (!updated || (updated as unknown[]).length === 0) {
    console.warn('[analysis-jobs] terminal write skipped — job already closed', {
      jobId,
      status,
    });
    return;
  }
  if (status === 'failed' && touchAiErrorOnFail) {
    await applyAiErrorIfStillPending(client, biographyId, kind);
  }
}

/**
 * Inserisce un lavoro 'running' (dopo bonifica scaduti) e lancia work() senza attenderlo.
 * Se ne gira già uno, restituisce il suo id senza avviare nulla.
 */
export async function startAnalysisJob(
  client: AnyClient,
  biographyId: string,
  kind: AnalysisJobKind,
  work: () => Promise<unknown>,
  context: AnalysisJobContext = {}
): Promise<{ jobId: string; started: boolean }> {
  await interruptStaleJobs(client, biographyId, kind);

  const existing = await findRunningJob(client, biographyId, kind);
  if (existing) return { jobId: existing, started: false };

  const { data, error } = await client
    .from('analysis_jobs')
    .insert({
      biography_id: biographyId,
      kind,
      status: 'running',
      context,
    })
    .select('id')
    .maybeSingle();

  if (error && isUniqueViolation(error)) {
    const again = await findRunningJob(client, biographyId, kind);
    if (again) return { jobId: again, started: false };
    console.error('[analysis-jobs] unique violation but no running row', error);
    throw new Error('analysis_job_conflict');
  }
  if (error || !(data as { id?: string } | null)?.id) {
    throw new Error(`analysis_job_insert_failed:${error?.message ?? 'no row'}`);
  }

  const jobId = (data as { id: string }).id;

  void (async () => {
    try {
      const outcome = await work();
      await finishJob(client, jobId, biographyId, kind, 'done', outcome, false);
    } catch (err) {
      console.error('[analysis-jobs] work failed', { jobId, kind, err });
      await finishJob(
        client,
        jobId,
        biographyId,
        kind,
        'failed',
        {
          error: 'exception',
          message: err instanceof Error ? err.message : String(err),
        },
        true
      );
    }
  })().catch((err) => {
    console.error('[analysis-jobs] background work rejected', { jobId, kind, err });
  });

  return { jobId, started: true };
}

export type LatestJobView =
  | { status: 'none' }
  | {
      status: AnalysisJobStatus;
      jobId: string;
      outcome: unknown;
      startedAt: string;
      finishedAt: string | null;
    };

/** Bonifica scaduti, poi restituisce l'ultimo lavoro per (bio, kind). */
export async function getLatestJob(
  client: AnyClient,
  biographyId: string,
  kind: AnalysisJobKind
): Promise<LatestJobView> {
  await interruptStaleJobs(client, biographyId, kind);

  const { data } = await client
    .from('analysis_jobs')
    .select('id, status, outcome, started_at, finished_at')
    .eq('biography_id', biographyId)
    .eq('kind', kind)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as {
    id?: string;
    status?: AnalysisJobStatus;
    outcome?: unknown;
    started_at?: string;
    finished_at?: string | null;
  } | null;

  if (!row?.id || !row.status) return { status: 'none' };
  return {
    status: row.status,
    jobId: row.id,
    outcome: row.outcome ?? null,
    startedAt: row.started_at ?? '',
    finishedAt: row.finished_at ?? null,
  };
}
