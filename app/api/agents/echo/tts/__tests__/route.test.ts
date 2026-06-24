import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authenticateAgentRequest = vi.fn();
const checkAgentRateLimit = vi.fn();
const isEchoTtsConfigured = vi.fn();
const synthesizeVoxtralSpeech = vi.fn();
const buildServiceClient = vi.fn(() => ({}));

vi.mock('@/lib/agents/agent-chat-handler', () => ({
  authenticateAgentRequest: (req: unknown) => authenticateAgentRequest(req),
}));

vi.mock('@/lib/agents/thread-service', () => ({
  checkAgentRateLimit: () => checkAgentRateLimit(),
}));

vi.mock('@/lib/echo/voice-config', () => ({
  isEchoTtsConfigured: () => isEchoTtsConfigured(),
}));

vi.mock('@/lib/echo/voxtral-tts', () => ({
  synthesizeVoxtralSpeech: (text: string, language: string) =>
    synthesizeVoxtralSpeech(text, language),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
}));

describe('echo/tts route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAgentRateLimit.mockResolvedValue({ allowed: true });
    isEchoTtsConfigured.mockReturnValue(true);
    synthesizeVoxtralSpeech.mockResolvedValue(new ArrayBuffer(8));
  });

  it('GET returns public TTS config', async () => {
    isEchoTtsConfigured.mockReturnValue(false);
    const { GET } = await import('@/app/api/agents/echo/tts/route');
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      configured: false,
      provider: 'voxtral',
      region: 'eu-mistral',
    });
  });

  it('POST synthesizes speech for authenticated users', async () => {
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    const { POST } = await import('@/app/api/agents/echo/tts/route');
    const req = new NextRequest('http://localhost/api/agents/echo/tts', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ text: 'Ciao', language: 'it' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(synthesizeVoxtralSpeech).toHaveBeenCalledWith('Ciao', 'it');
  });

  it('POST without auth returns 401', async () => {
    authenticateAgentRequest.mockResolvedValue({ ok: false, status: 401, error: 'Authentication required' });
    const { POST } = await import('@/app/api/agents/echo/tts/route');
    const req = new NextRequest('http://localhost/api/agents/echo/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST without text returns 400', async () => {
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    const { POST } = await import('@/app/api/agents/echo/tts/route');
    const req = new NextRequest('http://localhost/api/agents/echo/tts', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ text: '   ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('POST returns 429 when rate limited', async () => {
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    checkAgentRateLimit.mockResolvedValue({ allowed: false, reason: 'burst' });
    const { POST } = await import('@/app/api/agents/echo/tts/route');
    const req = new NextRequest('http://localhost/api/agents/echo/tts', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ text: 'Hello' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
