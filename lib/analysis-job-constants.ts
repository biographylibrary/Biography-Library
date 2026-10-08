/** Minuti dopo i quali un lavoro 'running' si considera interrotto (default). */
export const ANALYSIS_JOB_STALE_MINUTES_DEFAULT = 20;

/**
 * Soglia di scadenza lavori. Sovrascrivibile da ANALYSIS_JOB_STALE_MINUTES
 * solo fuori da produzione (stesso controllo NODE_ENV di chunk-limits).
 */
export function analysisJobStaleMinutes(): number {
  if (process.env.NODE_ENV === 'production') return ANALYSIS_JOB_STALE_MINUTES_DEFAULT;
  const raw = process.env.ANALYSIS_JOB_STALE_MINUTES?.trim();
  if (!raw) return ANALYSIS_JOB_STALE_MINUTES_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return ANALYSIS_JOB_STALE_MINUTES_DEFAULT;
  return n;
}

export type AnalysisJobKind = 'screening' | 'preprint_check';
export type AnalysisJobStatus = 'running' | 'done' | 'failed' | 'interrupted';
