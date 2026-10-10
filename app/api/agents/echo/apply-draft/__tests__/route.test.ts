import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authenticateAgentRequest = vi.fn();
const verifyBiographyOwnership = vi.fn();
const appendDraftToBiography = vi.fn();

vi.mock('@/lib/agents/agent-chat-handler', () => ({
  authenticateAgentRequest: (req: unknown) => authenticateAgentRequest(req),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => ({}),
}));

vi.mock('@/lib/agents/thread-service', () => ({
  verifyBiographyOwnership: (...args: unknown[]) => verifyBiographyOwnership(...args),
}));

vi.mock('@/lib/echo/apply-draft', () => ({
  appendDraftToBiography: (...args: unknown[]) => appendDraftToBiography(...args),
}));

import { POST } from '@/app/api/agents/echo/apply-draft/route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/agents/echo/apply-draft', {
    method: 'POST',
    headers: { authorization: 'Bearer jwt', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  biographyId: 'bio-1',
  sectionKey: 'freeflow',
  draftText: 'Nuovo paragrafo.',
};

describe('POST /api/agents/echo/apply-draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateAgentRequest.mockResolvedValue({ ok: true, userId: 'user-1', jwt: 'jwt' });
    verifyBiographyOwnership.mockResolvedValue({ ok: true, isEdition: false });
    appendDraftToBiography.mockResolvedValue({ ok: true });
  });

  it('edizione: 403 echo_not_available_for_edition senza scrivere testo', async () => {
    verifyBiographyOwnership.mockResolvedValue({ ok: true, isEdition: true });
    const res = await POST(request(validBody));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'echo_not_available_for_edition' });
    expect(appendDraftToBiography).not.toHaveBeenCalled();
  });

  it('originale: applica il draft come prima', async () => {
    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    expect(appendDraftToBiography).toHaveBeenCalled();
  });
});
