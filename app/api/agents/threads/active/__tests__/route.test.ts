import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authenticateAgentRequest = vi.fn();
const verifyBiographyOwnership = vi.fn();
const getActiveThread = vi.fn();
const getOrCreateThread = vi.fn();
const loadRecentThreadMessages = vi.fn();
const appendMessage = vi.fn();
const getAgentUiMessageLimit = vi.fn(() => 200);

vi.mock('@/lib/agents/agent-chat-handler', () => ({
  authenticateAgentRequest: (req: unknown) => authenticateAgentRequest(req),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ count: 0 }),
      }),
    }),
  }),
}));

vi.mock('@/lib/agents/thread-service', () => ({
  getActiveThread: (client: unknown, params: unknown) => getActiveThread(client, params),
  getOrCreateThread: (client: unknown, params: unknown) => getOrCreateThread(client, params),
  loadRecentThreadMessages: (client: unknown, threadId: string, limit: number) =>
    loadRecentThreadMessages(client, threadId, limit),
  appendMessage: (client: unknown, threadId: string, message: unknown) =>
    appendMessage(client, threadId, message),
  getAgentUiMessageLimit: () => getAgentUiMessageLimit(),
  verifyBiographyOwnership: (client: unknown, biographyId: string, userId: string) =>
    verifyBiographyOwnership(client, biographyId, userId),
}));

vi.mock('@/lib/i18n/echo-guide-content', () => ({
  getEchoUsageGuideForLocale: () => 'usage guide',
}));

vi.mock('@/lib/echo/echo-usage-guide', () => ({
  wrapUsageGuideContent: (content: string) => content,
  isUsageGuideContent: () => false,
}));

describe('threads/active route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    verifyBiographyOwnership.mockResolvedValue({ ok: true });
    loadRecentThreadMessages.mockResolvedValue([]);
    appendMessage.mockResolvedValue({
      id: 'guide-1',
      role: 'assistant',
      content: 'usage guide',
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('GET returns null thread when none exists for non-echo agents', async () => {
    getActiveThread.mockResolvedValue(null);
    const { GET } = await import('@/app/api/agents/threads/active/route');
    const req = new NextRequest(
      'http://localhost/api/agents/threads/active?agentType=biography_coach&biographyId=bio-1'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ thread: null, messages: [] });
  });

  it('GET creates echo thread when missing', async () => {
    getActiveThread.mockResolvedValue(null);
    getOrCreateThread.mockResolvedValue({
      id: 'thread-new',
      user_id: 'user-1',
      biography_id: 'bio-1',
      agent_type: 'echo',
    });

    const { GET } = await import('@/app/api/agents/threads/active/route');
    const req = new NextRequest(
      'http://localhost/api/agents/threads/active?agentType=echo&biographyId=bio-1&locale=it'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.thread.id).toBe('thread-new');
    expect(getOrCreateThread).toHaveBeenCalled();
    expect(appendMessage).toHaveBeenCalled();
  });

  it('GET returns 403 for biography not owned by user', async () => {
    verifyBiographyOwnership.mockResolvedValue({ ok: false });
    const { GET } = await import('@/app/api/agents/threads/active/route');
    const req = new NextRequest(
      'http://localhost/api/agents/threads/active?agentType=echo&biographyId=foreign-bio'
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
