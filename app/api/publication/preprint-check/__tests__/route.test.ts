import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
const from = vi.fn();
const checkPerUserThrottle = vi.fn();
const assertAiFeaturesEnabled = vi.fn();
const startAnalysisJob = vi.fn();
const canRunPreprintCheck = vi.fn();
const resolveContentFingerprintForPreprint = vi.fn();
const runPreprintCheck = vi.fn();
const recordPreprintCheckRun = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: () => getUser() },
  }),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => ({ from: (...a: unknown[]) => from(...a) }),
  checkPerUserThrottle: (...a: unknown[]) => checkPerUserThrottle(...a),
}));

vi.mock('@/lib/server/require-ai-features', () => ({
  assertAiFeaturesEnabled: (...a: unknown[]) => assertAiFeaturesEnabled(...a),
  AI_FEATURES_DISABLED_ERROR: 'ai_features_disabled',
}));

vi.mock('@/lib/server/analysis-jobs', () => ({
  startAnalysisJob: (...a: unknown[]) => startAnalysisJob(...a),
}));

vi.mock('@/lib/server/preprint-check', () => ({
  canRunPreprintCheck: (...a: unknown[]) => canRunPreprintCheck(...a),
  recordPreprintCheckRun: (...a: unknown[]) => recordPreprintCheckRun(...a),
  resolveContentFingerprintForPreprint: (...a: unknown[]) =>
    resolveContentFingerprintForPreprint(...a),
  runPreprintCheck: (...a: unknown[]) => runPreprintCheck(...a),
}));

describe('preprint-check route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    assertAiFeaturesEnabled.mockResolvedValue({ ok: true });
    checkPerUserThrottle.mockResolvedValue(true);
    from.mockImplementation((table: string) => {
      if (table === 'biographies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { user_id: 'user-1', status: 'pdf_draft' },
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      return {};
    });
    resolveContentFingerprintForPreprint.mockResolvedValue('fp-1');
    canRunPreprintCheck.mockResolvedValue({ ok: true });
    startAnalysisJob.mockResolvedValue({ jobId: 'job-1', started: true });
    runPreprintCheck.mockResolvedValue({ emptyText: false, aiError: false });
  });

  it('POST 401 senza token', async () => {
    const { POST } = await import('@/app/api/publication/preprint-check/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/preprint-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required' });
    expect(assertAiFeaturesEnabled).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(startAnalysisJob).not.toHaveBeenCalled();
    expect(runPreprintCheck).not.toHaveBeenCalled();
  });

  it('POST 403 ai_features_disabled quando le funzioni IA sono spente, senza leggere la biografia né il modello', async () => {
    assertAiFeaturesEnabled.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'ai_features_disabled',
    });
    const { POST } = await import('@/app/api/publication/preprint-check/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/preprint-check', {
        method: 'POST',
        headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'ai_features_disabled' });
    expect(assertAiFeaturesEnabled).toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(checkPerUserThrottle).not.toHaveBeenCalled();
    expect(resolveContentFingerprintForPreprint).not.toHaveBeenCalled();
    expect(startAnalysisJob).not.toHaveBeenCalled();
    expect(runPreprintCheck).not.toHaveBeenCalled();
  });

  it('POST con funzioni IA accese procede e avvia il job (mock modello)', async () => {
    assertAiFeaturesEnabled.mockResolvedValue({ ok: true });
    const { POST } = await import('@/app/api/publication/preprint-check/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/preprint-check', {
        method: 'POST',
        headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ jobId: 'job-1' });
    expect(assertAiFeaturesEnabled).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith('biographies');
    expect(startAnalysisJob).toHaveBeenCalled();
  });
});
