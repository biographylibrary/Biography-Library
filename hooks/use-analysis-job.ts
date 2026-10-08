'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisJobKind, AnalysisJobStatus } from '@/lib/analysis-job-constants';
import { supabase } from '@/lib/supabase';

/** Esposti per i test con timer finti. */
export const ANALYSIS_JOB_POLL_FAST_MS = 3_000;
export const ANALYSIS_JOB_POLL_SLOW_MS = 15_000;
export const ANALYSIS_JOB_POLL_SLOW_AFTER_MS = 10 * 60_000;
/** Ritardo per un secondo tentativo se la prima lettura al montaggio fallisce (es. 401). */
export const ANALYSIS_JOB_POLL_MOUNT_RETRY_MS = 500;
/** Errori consecutivi dopo i quali si passa al ritardo lento (senza fermarsi). */
export const ANALYSIS_JOB_POLL_ERROR_SLOW_AFTER = 10;

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

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const pollingRef = useRef(false);
  const jobRef = useRef<AnalysisJobPoll | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickInFlightRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stillWaiting = useCallback((): boolean => {
    if (!pollingRef.current) return false;
    const current = jobRef.current;
    return current === null || current.status === 'running';
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();
    if (!enabledRef.current || !stillWaiting()) return;

    const elapsed =
      startedAtRef.current != null ? Date.now() - startedAtRef.current : 0;
    const useSlow =
      elapsed >= ANALYSIS_JOB_POLL_SLOW_AFTER_MS ||
      consecutiveErrorsRef.current >= ANALYSIS_JOB_POLL_ERROR_SLOW_AFTER;
    const delay = useSlow ? ANALYSIS_JOB_POLL_SLOW_MS : ANALYSIS_JOB_POLL_FAST_MS;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      void tickRef.current();
    }, delay);
  }, [clearTimer, stillWaiting]);

  const fetchOnce = useCallback(async (): Promise<AnalysisJobPoll | null> => {
    try {
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
    } catch {
      return null;
    }
  }, [biographyId, kind]);

  const tick = useCallback(async () => {
    if (!enabledRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (tickInFlightRef.current) return;
    tickInFlightRef.current = true;
    try {
      const next = await fetchOnce();
      if (!next) {
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current === ANALYSIS_JOB_POLL_ERROR_SLOW_AFTER) {
          console.warn(
            '[useAnalysisJob] 10 consecutive poll errors; switching to slow interval',
            { biographyId, kind }
          );
        }
        if (stillWaiting()) scheduleNext();
        return;
      }

      consecutiveErrorsRef.current = 0;
      jobRef.current = next;
      setJob(next);

      if (next.status === 'running') {
        expectSettleRef.current = true;
        pollingRef.current = true;
        setPolling(true);
        if (startedAtRef.current == null) {
          startedAtRef.current = Date.parse(next.startedAt) || Date.now();
        }
        scheduleNext();
        return;
      }

      pollingRef.current = false;
      setPolling(false);
      clearTimer();

      if (expectSettleRef.current && next.status !== 'none') {
        expectSettleRef.current = false;
        onSettledRef.current?.(next);
      }
    } finally {
      tickInFlightRef.current = false;
    }
  }, [biographyId, kind, fetchOnce, scheduleNext, stillWaiting, clearTimer]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  /** Avvia (o riprende) il sondaggio dopo un 202. */
  const watch = useCallback(() => {
    expectSettleRef.current = true;
    startedAtRef.current = Date.now();
    consecutiveErrorsRef.current = 0;
    pollingRef.current = true;
    setPolling(true);
    void tick();
  }, [tick]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        void tickRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!enabled || !biographyId) return;
    let cancelled = false;

    void (async () => {
      await tick();
      if (cancelled) return;
      // Prima lettura al montaggio fallita (es. 401 prima che il token sia pronto):
      // un secondo tentativo dopo un breve ritardo, senza lasciare l'hook morto.
      if (jobRef.current === null) {
        await new Promise((r) => setTimeout(r, ANALYSIS_JOB_POLL_MOUNT_RETRY_MS));
        if (!cancelled) await tick();
      }
    })();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [enabled, biographyId, kind, tick, clearTimer]);

  return { job, polling, watch, refresh: tick };
}
