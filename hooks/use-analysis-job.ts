'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisJobKind, AnalysisJobStatus } from '@/lib/analysis-job-constants';
import { supabase } from '@/lib/supabase';

/** Esposti per i test con timer finti. */
export const ANALYSIS_JOB_POLL_FAST_MS = 3_000;
export const ANALYSIS_JOB_POLL_SLOW_MS = 15_000;
export const ANALYSIS_JOB_POLL_SLOW_AFTER_MS = 10 * 60_000;

export type AnalysisJobPoll =
  | { status: 'none' }
  | {
      status: AnalysisJobStatus;
      jobId: string;
      outcome: unknown;
      startedAt: string;
      finishedAt: string | null;
    };

export type UseAnalysisJobOptions = {
  biographyId: string;
  kind: AnalysisJobKind;
  /** Se false, non interroga (es. scheda nascosta / dialog chiuso). */
  enabled?: boolean;
  /** Solo quando si esce da 'running' in questa sessione (dopo watch o ripresa). */
  onSettled?: (job: Exclude<AnalysisJobPoll, { status: 'none' }>) => void;
};

export function useAnalysisJob({
  biographyId,
  kind,
  enabled = true,
  onSettled,
}: UseAnalysisJobOptions) {
  const [job, setJob] = useState<AnalysisJobPoll | null>(null);
  const [polling, setPolling] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const expectSettleRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const fetchOnce = useCallback(async (): Promise<AnalysisJobPoll | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    const qs = new URLSearchParams({ biographyId, kind });
    const res = await fetch(`/api/analysis-jobs?${qs}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as AnalysisJobPoll;
  }, [biographyId, kind]);

  const tick = useCallback(async () => {
    if (!enabled) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const next = await fetchOnce();
    if (!next) return;
    setJob(next);
    if (next.status === 'running') {
      expectSettleRef.current = true;
      setPolling(true);
      if (startedAtRef.current == null) {
        startedAtRef.current = Date.parse(next.startedAt) || Date.now();
      }
      return;
    }
    setPolling(false);
    if (expectSettleRef.current && next.status !== 'none') {
      expectSettleRef.current = false;
      onSettledRef.current?.(next);
    }
  }, [enabled, fetchOnce]);

  /** Avvia (o riprende) il sondaggio dopo un 202. */
  const watch = useCallback(() => {
    expectSettleRef.current = true;
    startedAtRef.current = Date.now();
    setPolling(true);
    void tick();
  }, [tick]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && enabled) void tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled, tick]);

  useEffect(() => {
    if (!enabled || !biographyId) return;
    void tick();
  }, [enabled, biographyId, kind, tick]);

  useEffect(() => {
    if (!enabled || !polling) return;
    if (job && job.status !== 'running') return;

    const elapsed =
      startedAtRef.current != null ? Date.now() - startedAtRef.current : 0;
    const delay =
      elapsed >= ANALYSIS_JOB_POLL_SLOW_AFTER_MS
        ? ANALYSIS_JOB_POLL_SLOW_MS
        : ANALYSIS_JOB_POLL_FAST_MS;
    const id = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      void tick();
    }, delay);
    return () => window.clearTimeout(id);
  }, [enabled, polling, job, tick]);

  return { job, polling, watch, refresh: tick };
}
