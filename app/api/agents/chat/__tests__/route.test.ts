import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authenticateAgentRequest = vi.fn();
const parseAgentChatBody = vi.fn();
const prepareAgentTurn = vi.fn();
const appendMessage = vi.fn();
const chat = vi.fn();
const buildServiceClient = vi.fn(() => ({}));

vi.mock('@/lib/agents/agent-chat-handler', () => ({
  authenticateAgentRequest: (req: unknown) => authenticateAgentRequest(req),
  parseAgentChatBody: (req: unknown) => parseAgentChatBody(req),
  prepareAgentTurn: (userId: string, payload: unknown) => prepareAgentTurn(userId, payload),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
}));

vi.mock('@/lib/agents/thread-service', () => ({
  appendMessage: (client: unknown, threadId: string, message: unknown) =>
    appendMessage(client, threadId, message),
}));

vi.mock('@/lib/agents/infomaniak-client', () => ({
  chat: (opts: unknown) => chat(opts),
}));

describe('agents/chat route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    parseAgentChatBody.mockResolvedValue({
      agentType: 'publication_reviewer',
      message: 'Is this ready?',
      biographyId: 'bio-1',
    });
    prepareAgentTurn.mockResolvedValue({
      ok: true,
      threadId: 'thread-1',
      history: [],
      userMessage: 'Is this ready?',
      systemPrompt: 'Reviewer prompt',
      role: 'reviewer',
      agentType: 'publication_reviewer',
      userId: 'user-1',
    });
    chat.mockResolvedValue({
      content: 'Looks good overall.',
      modelUsed: 'google/gemma-4-31B-it',
    });
    appendMessage.mockResolvedValue({ id: 'msg-1' });
  });

  it('uses reviewer role (Gemma) for publication_reviewer chat', async () => {
    const { POST } = await import('@/app/api/agents/chat/route');
    const res = await POST(
      new NextRequest('http://localhost/api/agents/chat', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({
          agentType: 'publication_reviewer',
          message: 'Is this ready?',
          biographyId: 'bio-1',
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.modelUsed).toBe('google/gemma-4-31B-it');
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'reviewer' })
    );
    expect(chat.mock.calls[0][0].role).not.toBe('apertus');
  });

  it('returns 401 when unauthenticated', async () => {
    authenticateAgentRequest.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Authentication required',
    });
    const { POST } = await import('@/app/api/agents/chat/route');
    const res = await POST(
      new NextRequest('http://localhost/api/agents/chat', {
        method: 'POST',
        body: JSON.stringify({ agentType: 'echo', message: 'Hi' }),
      })
    );
    expect(res.status).toBe(401);
  });
});
