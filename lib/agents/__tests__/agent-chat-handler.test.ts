import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkAgentRateLimit = vi.fn();
const verifyBiographyOwnership = vi.fn();
const getOrCreateThread = vi.fn();
const buildAgentContext = vi.fn();
const indexBiography = vi.fn();
const retrieveBiographyContext = vi.fn();
const ensureHelpKbIndexed = vi.fn();
const retrieveKbContext = vi.fn();

/**
 * Finto client di servizio. La rotta legge `profiles.role` per decidere se
 * saltare il limite di frequenza allo staff: senza `.from` il mock esplode
 * prima di arrivare al caso sotto test.
 */
const serviceClientStub = () => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
  }),
});

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => serviceClientStub(),
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

const assertAiFeaturesEnabled = vi.fn();

vi.mock('@/lib/server/require-ai-features', () => ({
  assertAiFeaturesEnabled: (...args: unknown[]) => assertAiFeaturesEnabled(...args),
  AI_FEATURES_DISABLED_ERROR: 'ai_features_disabled',
}));

import { prepareAgentTurn } from '@/lib/agents/agent-chat-handler';

describe('prepareAgentTurn memorial context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAiFeaturesEnabled.mockResolvedValue({ ok: true });
    checkAgentRateLimit.mockResolvedValue({ allowed: true });
    getOrCreateThread.mockResolvedValue({ id: 'thread-1' });
    buildAgentContext.mockResolvedValue({ history: [], memoryBlock: '' });
    indexBiography.mockResolvedValue(undefined);
    retrieveBiographyContext.mockResolvedValue('');
    ensureHelpKbIndexed.mockResolvedValue(undefined);
    retrieveKbContext.mockResolvedValue('');
  });

  it('Echo: 403 ai_features_disabled quando le funzioni IA sono spente (prova di rottura)', async () => {
    assertAiFeaturesEnabled.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'ai_features_disabled',
    });
    const result = await prepareAgentTurn('user-1', {
      agentType: 'echo',
      message: 'Help',
      language: 'en',
      echoPage: 'hub',
    });
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'ai_features_disabled',
    });
    expect(getOrCreateThread).not.toHaveBeenCalled();
    // Se qualcuno toglie il gate, questo deve diventare rosso: senza chiamare il gate
    // il turno proseguirebbe e getOrCreateThread verrebbe invocato.
    expect(assertAiFeaturesEnabled).toHaveBeenCalled();
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

  it('edizione: 403 echo_not_available_for_edition senza thread né indice', async () => {
    verifyBiographyOwnership.mockResolvedValue({
      ok: true,
      isEdition: true,
      biography_mode: 'freeflow',
      status: 'draft',
    });

    const result = await prepareAgentTurn('user-1', {
      agentType: 'echo',
      message: 'Aiutami',
      biographyId: 'edition-1',
      language: 'it',
      echoPage: 'editor_freeflow',
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'echo_not_available_for_edition',
    });
    expect(getOrCreateThread).not.toHaveBeenCalled();
    expect(indexBiography).not.toHaveBeenCalled();
  });
});
