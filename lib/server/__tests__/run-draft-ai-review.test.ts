import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

describe('runDraftAiReview', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    process.env.INFOMANIAK_AI_TOKEN = 'test-token';
    process.env.INFOMANIAK_AI_ENDPOINT = 'https://ai.example/v1/chat/completions';
    delete process.env.AGENT_MODEL_REVIEWER;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.INFOMANIAK_AI_TOKEN;
    delete process.env.INFOMANIAK_AI_ENDPOINT;
    delete process.env.AGENT_MODEL_REVIEWER;
  });

  it('uses reviewer Gemma model for draft PDF review, not Apertus', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overall_quality: 4,
                strengths: ['Warm voice'],
                suggestions: [],
                red_flags: [],
                ready_for_publication: true,
              }),
            },
          },
        ],
      }),
    });

    const { runDraftAiReview } = await import('@/lib/server/review-submit-pipeline');
    const feedback = await runDraftAiReview('My life story text', 1, 'it');

    expect(feedback.aiError).toBeUndefined();
    expect(feedback.overall_quality).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.model).toBe('google/gemma-4-31B-it');
    expect(body.model).not.toContain('Apertus');
  });

  it('returns aiError fallback when Infomaniak is not configured', async () => {
    delete process.env.INFOMANIAK_AI_TOKEN;
    vi.resetModules();
    const { runDraftAiReview } = await import('@/lib/server/review-submit-pipeline');
    const feedback = await runDraftAiReview('text', 1, 'en');
    expect(feedback.aiError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
