import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkAgentRateLimit = vi.fn();
const verifyBiographyOwnership = vi.fn();
const getOrCreateThread = vi.fn();
const buildAgentContext = vi.fn();
const indexBiography = vi.fn();
const retrieveBiographyContext = vi.fn();
const ensureHelpKbIndexed = vi.fn();
const retrieveKbContext = vi.fn();

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => ({}),
}));

vi.mock('@/lib/agents/thread-service', () => ({
  checkAgentRateLimit: (...args: unknown[]) => checkAgentRateLimit(...args),
  verifyBiographyOwnership: (...args: unknown[]) => verifyBiographyOwnership(...args),
  getOrCreateThread: (...args: unknown[]) => getOrCreateThread(...args),
}));

vi.mock('@/lib/agents/thread-memory', () => ({
  buildAgentContext: (...args: unknown[]) => buildAgentContext(...args),
}));

vi.mock('@/lib/agents/rag/biography-rag', () => ({
  indexBiography: (...args: unknown[]) => indexBiography(...args),
  retrieveBiographyContext: (...args: unknown[]) => retrieveBiographyContext(...args),
}));

vi.mock('@/lib/agents/rag/kb-rag', () => ({
  ensureHelpKbIndexed: (...args: unknown[]) => ensureHelpKbIndexed(...args),
  retrieveKbContext: (...args: unknown[]) => retrieveKbContext(...args),
}));

vi.mock('@/lib/agents/tools/echo-tools', () => ({
  getEchoToolsForContext: () => [],
  executeEchoTool: vi.fn(),
}));

vi.mock('@/lib/agents/tools/coach-tools', () => ({
  COACH_TOOL_DEFINITIONS: [],
  executeCoachTool: vi.fn(),
}));

vi.mock('@/lib/agents/tools/reviewer-tools', () => ({
  REVIEWER_CHAT_TOOL_DEFINITIONS: [],
  executeReviewerTool: vi.fn(),
}));

import { prepareAgentTurn } from '@/lib/agents/agent-chat-handler';

describe('prepareAgentTurn memorial context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAgentRateLimit.mockResolvedValue({ allowed: true });
    getOrCreateThread.mockResolvedValue({ id: 'thread-1' });
    buildAgentContext.mockResolvedValue({ history: [], memoryBlock: '' });
    indexBiography.mockResolvedValue(undefined);
    retrieveBiographyContext.mockResolvedValue('');
    ensureHelpKbIndexed.mockResolvedValue(undefined);
    retrieveKbContext.mockResolvedValue('');
  });

  it('injects memorial block and subject name into Echo system prompt', async () => {
    verifyBiographyOwnership.mockResolvedValue({
      ok: true,
      biography_mode: 'sections',
      status: 'draft',
      narrative: {
        biographyType: 'memorial',
        subjectName: 'Francesco',
        writerName: 'Maria',
      },
    });

    const result = await prepareAgentTurn('user-1', {
      agentType: 'echo',
      message: 'Help me with childhood',
      biographyId: 'bio-1',
      language: 'it',
      echoPage: 'editor_sections',
      activeSection: 'childhood',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.systemPrompt).toContain('Francesco');
    expect(result.systemPrompt).toContain('BIOGRAFIA MEMORIAL');
    expect(result.systemPrompt).toContain('documenting Francesco');
    expect(result.systemPrompt).toContain('ACTIVE SECTION');
  });

  it('injects memorial block into coach system prompt', async () => {
    verifyBiographyOwnership.mockResolvedValue({
      ok: true,
      biography_mode: 'sections',
      status: 'draft',
      narrative: {
        biographyType: 'memorial',
        subjectName: 'Francesco',
        writerName: 'Maria',
      },
    });

    const result = await prepareAgentTurn('user-1', {
      agentType: 'biography_coach',
      message: 'Start coaching',
      biographyId: 'bio-1',
      language: 'en',
      activeSection: 'childhood',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.systemPrompt).toContain('Francesco');
    expect(result.systemPrompt).toContain('MEMORIAL BIOGRAPHY');
    expect(result.systemPrompt).toContain('memories and facts about Francesco');
  });
});
