/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalysisJob } from '@/hooks/use-analysis-job';

const getSession = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

describe('useAnalysisJob', () => {
  let phase: 'running' | 'done';

  beforeEach(() => {
    phase = 'running';
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    fetchMock.mockImplementation(async () => {
      if (phase === 'running') {
        return {
          ok: true,
          json: async () => ({
            status: 'running',
            jobId: 'j1',
            outcome: null,
            startedAt: new Date().toISOString(),
            finishedAt: null,
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          status: 'done',
          jobId: 'j1',
          outcome: { result: 'published', screeningStatus: 'passed', isRescreen: false },
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        }),
      };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('dopo watch, onSettled quando il lavoro esce da running', async () => {
    const onSettled = vi.fn();
    const { result } = renderHook(() =>
      useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', onSettled })
    );

    await act(async () => {
      result.current.watch();
    });
    await waitFor(() => expect(result.current.job?.status).toBe('running'));

    phase = 'done';
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(onSettled.mock.calls[0][0].status).toBe('done');
  });

  it('non interroga con la scheda nascosta', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    renderHook(() => useAnalysisJob({ biographyId: 'bio-1', kind: 'screening', enabled: true }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
