import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authenticateAgentRequest = vi.fn();
const verifyThreadOwnership = vi.fn();
const loadRecentThreadMessages = vi.fn();
const loadThreadMessagesBefore = vi.fn();
const getAgentUiMessageLimit = vi.fn(() => 200);

vi.mock('@/lib/agents/agent-chat-handler', () => ({
  authenticateAgentRequest: (req: unknown) => authenticateAgentRequest(req),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          lt: () => Promise.resolve({ count: 0 }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/agents/thread-service', () => ({
  verifyThreadOwnership: (client: unknown, threadId: string, userId: string) =>
    verifyThreadOwnership(client, threadId, userId),
  loadRecentThreadMessages: (client: unknown, threadId: string, limit: number) =>
    loadRecentThreadMessages(client, threadId, limit),
  loadThreadMessagesBefore: (client: unknown, threadId: string, before: string, limit: number) =>
    loadThreadMessagesBefore(client, threadId, before, limit),
  getAgentUiMessageLimit: () => getAgentUiMessageLimit(),
}));

describe('threads/[id]/messages route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns paginated messages for owned thread', async () => {
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    verifyThreadOwnership.mockResolvedValue({ id: 'thread-1', user_id: 'user-1' });
    loadRecentThreadMessages.mockResolvedValue([
      { id: 'm1', role: 'user', content: 'Hi', created_at: '2026-01-01T00:00:00Z' },
      { id: 'm2', role: 'assistant', content: 'Hello', created_at: '2026-01-01T00:00:01Z' },
      { id: 'm3', role: 'tool', content: '{}', created_at: '2026-01-01T00:00:02Z' },
    ]);

    const { GET } = await import('@/app/api/agents/threads/[id]/messages/route');
    const req = new NextRequest('http://localhost/api/agents/threads/thread-1/messages?limit=50');
    const res = await GET(req, { params: { id: 'thread-1' } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(2);
    expect(body.messages.every((m: { role: string }) => m.role === 'user' || m.role === 'assistant')).toBe(true);
  });

  it('GET hides thread owned by another user as 404', async () => {
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    verifyThreadOwnership.mockResolvedValue(null);

    const { GET } = await import('@/app/api/agents/threads/[id]/messages/route');
    const req = new NextRequest('http://localhost/api/agents/threads/other-thread/messages');
    const res = await GET(req, { params: { id: 'other-thread' } });

    expect(res.status).toBe(404);
  });
});
