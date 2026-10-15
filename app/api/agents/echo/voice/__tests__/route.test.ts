import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authenticateAgentRequest = vi.fn();
const assertAiFeaturesEnabled = vi.fn();
const buildServiceClient = vi.fn(() => ({}));

vi.mock('@/lib/agents/agent-chat-handler', () => ({
  authenticateAgentRequest: (req: unknown) => authenticateAgentRequest(req),
}));

vi.mock('@/lib/server/require-ai-features', () => ({
  assertAiFeaturesEnabled: (...a: unknown[]) => assertAiFeaturesEnabled(...a),
  AI_FEATURES_DISABLED_ERROR: 'ai_features_disabled',
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
}));

describe('echo/voice route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    assertAiFeaturesEnabled.mockResolvedValue({ ok: true });
  });

  it('501 quando la voce realtime non è abilitata ma le funzioni IA sì', async () => {
    const { POST } = await import('@/app/api/agents/echo/voice/route');
    const res = await POST(
      new NextRequest('http://localhost/api/agents/echo/voice', { method: 'POST' })
    );
    expect(res.status).toBe(501);
    expect(assertAiFeaturesEnabled).toHaveBeenCalled();
  });

  it('403 ai_features_disabled quando le funzioni IA sono spente (prova di rottura)', async () => {
    assertAiFeaturesEnabled.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'ai_features_disabled',
    });
    const { POST } = await import('@/app/api/agents/echo/voice/route');
    const res = await POST(
      new NextRequest('http://localhost/api/agents/echo/voice', { method: 'POST' })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'ai_features_disabled' });
    expect(assertAiFeaturesEnabled).toHaveBeenCalled();
  });
});
