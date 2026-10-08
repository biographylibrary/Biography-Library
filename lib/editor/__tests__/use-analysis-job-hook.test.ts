/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYSIS_JOB_POLL_ERROR_SLOW_AFTER,
  ANALYSIS_JOB_POLL_FAST_MS,
  ANALYSIS_JOB_POLL_MOUNT_RETRY_MS,
  ANALYSIS_JOB_POLL_SLOW_AFTER_MS,
  ANALYSIS_JOB_POLL_SLOW_MS,
  useAnalysisJob,
} from '@/hooks/use-analysis-job';
import { applySubmitOutcome, outcomeFromFailedJob } from '@/lib/editor/analysis-job-outcomes';

const getSession = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

type JobPayload = {
  status: string;
  jobId: string;
  outcome: unknown;
  startedAt: string;
  finishedAt: string | null;
};

function runningJob(startedAt = new Date().toISOString()): JobPayload {
  return {
    status: 'running',
    jobId: 'j1',
    outcome: null,
    startedAt,
    finishedAt: null,
  };
}

function doneJob(): JobPayload {
  return {
    status: 'done',
    jobId: 'j1',
    outcome: { result: 'published', screeningStatus: 'passed', isRescreen: false },
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  };
}

function interruptedJob(): JobPayload {
  return {
    status: 'interrupted',
    jobId: 'j-int',
    outcome: { error: 'interrupted' },
    startedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    finishedAt: new Date().toISOString(),
  };
}

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('useAnalysisJob', () => {
  let nextPayload: JobPayload;

  beforeEach(() => {
    nextPayload = runningJob();
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => nextPayload,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('riprende al montaggio con un lavoro già running senza chiamare watch', async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    const { result } = renderHook(() =>
      useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', onSettled })
    );

    await act(async () => {
      await flushMicrotasks();
    });
    expect(result.current.job?.status).toBe('running');
    expect(result.current.polling).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    nextPayload = doneJob();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled.mock.calls[0][0].status).toBe('done');
  });

  it('arresta il sondaggio quando il lavoro finisce', async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    const { result } = renderHook(() =>
      useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', onSettled })
    );

    await act(async () => {
      await flushMicrotasks();
    });
    const callsAfterMount = fetchMock.mock.calls.length;

    nextPayload = doneJob();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });
    expect(result.current.polling).toBe(false);
    expect(onSettled).toHaveBeenCalledTimes(1);

    const callsAfterDone = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS * 5);
      await flushMicrotasks();
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterDone);
    expect(callsAfterDone).toBeGreaterThan(callsAfterMount);
  });

  it('rallenta a 15 secondi dopo 10 minuti', async () => {
    vi.useFakeTimers();
    const oldStart = new Date(Date.now() - ANALYSIS_JOB_POLL_SLOW_AFTER_MS - 1_000).toISOString();
    nextPayload = runningJob(oldStart);

    renderHook(() => useAnalysisJob({ biographyId: 'bio-1', kind: 'screening' }));

    await act(async () => {
      await flushMicrotasks();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_SLOW_MS - ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('montaggio con scheda pending e prima risposta interrupted → UI ai_error', async () => {
    nextPayload = interruptedJob();

    const { result } = renderHook(() => {
      const [aiScreeningResult, setAiScreeningResult] = useState<
        'pending' | 'ai_error' | 'passed' | null
      >('pending');
      const biographyStatus = 'under_review' as const;
      const { job } = useAnalysisJob({ biographyId: 'bio-1', kind: 'screening' });

      useEffect(() => {
        if (!job || (job.status !== 'failed' && job.status !== 'interrupted')) return;
        const showingPending =
          aiScreeningResult === 'pending' &&
          (biographyStatus === 'under_review' ||
            biographyStatus === 'locked_pending_screening');
        if (!showingPending) return;
        setAiScreeningResult(
          applySubmitOutcome(outcomeFromFailedJob()).aiScreeningResult as 'ai_error'
        );
      }, [job, aiScreeningResult, biographyStatus]);

      return { aiScreeningResult, job };
    });

    await waitFor(() => expect(result.current.job?.status).toBe('interrupted'));
    await waitFor(() => expect(result.current.aiScreeningResult).toBe('ai_error'));
  });

  it('non interroga con la scheda nascosta', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    renderHook(() => useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', enabled: true }));

    await act(async () => {
      await flushMicrotasks();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['risposta 500', async () => ({ ok: false, status: 500, json: async () => ({}) })],
    ['fetch che lancia', async () => {
      throw new Error('network down');
    }],
    ['401', async () => ({ ok: false, status: 401, json: async () => ({}) })],
  ])(
    'dopo una lettura fallita (%s) il sondaggio continua e onSettled scatta solo a fine lavoro',
    async (_label, failImpl) => {
      vi.useFakeTimers();
      const onSettled = vi.fn();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      let call = 0;
      fetchMock.mockImplementation(async () => {
        call += 1;
        if (call === 1) {
          return { ok: true, json: async () => runningJob() };
        }
        if (call === 2) {
          return failImpl();
        }
        return { ok: true, json: async () => doneJob() };
      });

      const { result } = renderHook(() =>
        useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', onSettled })
      );

      await act(async () => {
        await flushMicrotasks();
      });
      expect(result.current.job?.status).toBe('running');
      expect(result.current.polling).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
        await flushMicrotasks();
      });
      expect(onSettled).not.toHaveBeenCalled();
      expect(result.current.polling).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
        await flushMicrotasks();
      });
      expect(onSettled).toHaveBeenCalledTimes(1);
      expect(onSettled.mock.calls[0][0].status).toBe('done');
      warn.mockRestore();
    }
  );

  it('dieci errori consecutivi passano al ritardo lento; un successo riporta al veloce', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onSettled = vi.fn();

    let call = 0;
    fetchMock.mockImplementation(async () => {
      call += 1;
      if (call === 1) return { ok: true, json: async () => runningJob() };
      if (call <= 1 + ANALYSIS_JOB_POLL_ERROR_SLOW_AFTER) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, json: async () => runningJob() };
    });

    renderHook(() => useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', onSettled }));

    await act(async () => {
      await flushMicrotasks();
    });

    for (let i = 0; i < ANALYSIS_JOB_POLL_ERROR_SLOW_AFTER; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
        await flushMicrotasks();
      });
    }
    expect(warn).toHaveBeenCalled();

    const callsAfterErrors = fetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });
    // Ancora sul ritardo lento: il tick veloce non deve bastare
    expect(fetchMock.mock.calls.length).toBe(callsAfterErrors);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_SLOW_MS - ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterErrors + 1);

    // Dopo il successo il prossimo tick torna al ritardo veloce
    const afterSuccess = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });
    expect(fetchMock.mock.calls.length).toBe(afterSuccess + 1);
    expect(onSettled).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('watch() e prima lettura fallita: continua a interrogare', async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();

    let call = 0;
    fetchMock.mockImplementation(async () => {
      call += 1;
      if (call <= 2) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, json: async () => doneJob() };
    });

    const { result } = renderHook(() =>
      useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', onSettled })
    );

    await act(async () => {
      await flushMicrotasks();
      // Montaggio: due fallimenti (tick + retry), job ancora null
    });

    await act(async () => {
      result.current.watch();
      await flushMicrotasks();
    });
    expect(result.current.polling).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_FAST_MS);
      await flushMicrotasks();
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled.mock.calls[0][0].status).toBe('done');
  });

  it('montaggio con 401 poi 200: riprova dopo breve ritardo', async () => {
    vi.useFakeTimers();
    let call = 0;
    fetchMock.mockImplementation(async () => {
      call += 1;
      if (call === 1) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, json: async () => runningJob() };
    });

    const { result } = renderHook(() =>
      useAnalysisJob({ biographyId: 'bio-1', kind: 'screening' })
    );

    await act(async () => {
      await flushMicrotasks();
    });
    expect(result.current.job).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_JOB_POLL_MOUNT_RETRY_MS);
      await flushMicrotasks();
    });
    expect(result.current.job?.status).toBe('running');
    expect(result.current.polling).toBe(true);
  });
});
