import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { historyToChatMessages, runStreamingAgentTurn, type PreparedAgentTurn } from '@/lib/agents/run-agent-turn';

const appendMessage = vi.fn().mockResolvedValue({ id: 'msg-1' });
const maybeCompressThreadMemory = vi.fn().mockResolvedValue(undefined);
const chat = vi.fn();
const chatStream = vi.fn();
const executeCoachTool = vi.fn();
const executeEchoTool = vi.fn();

vi.mock('@/lib/agents/thread-service', () => ({
  appendMessage: (...args: unknown[]) => appendMessage(...args),
}));

vi.mock('@/lib/agents/thread-memory', () => ({
  maybeCompressThreadMemory: (...args: unknown[]) => maybeCompressThreadMemory(...args),
}));

vi.mock('@/lib/agents/infomaniak-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents/infomaniak-client')>();
  return {
    ...actual,
    chat: (...args: unknown[]) => chat(...args),
    chatStream: (...args: unknown[]) => chatStream(...args),
  };
});

vi.mock('@/lib/agents/tools/coach-tools', () => ({
  executeCoachTool: (...args: unknown[]) => executeCoachTool(...args),
}));

vi.mock('@/lib/agents/tools/reviewer-tools', () => ({
  executeReviewerTool: vi.fn(),
}));

vi.mock('@/lib/agents/tools/echo-tools', () => ({
  executeEchoTool: (...args: unknown[]) => executeEchoTool(...args),
}));

const preparedBase: PreparedAgentTurn = {
  threadId: 'thread-1',
  history: [],
  userMessage: 'Help me write childhood section',
  systemPrompt: 'You are a coach',
  role: 'coach',
  agentType: 'biography_coach',
  tools: [{ type: 'function', function: { name: 'propose_draft', description: 'draft', parameters: {} } }],
  biographyId: 'bio-1',
  userId: 'user-1',
};

describe('historyToChatMessages', () => {
  it('maps assistant tool calls and tool results', () => {
    const rows = [
      { role: 'user', content: 'hello' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'tc-1', type: 'function', function: { name: 'propose_draft', arguments: '{}' } }],
      },
      { role: 'tool', content: '{"preview":"draft text"}', tool_calls: { tool_call_id: 'tc-1' } },
    ];

    const messages = historyToChatMessages(rows);
    expect(messages).toHaveLength(3);
    expect(messages[1]).toMatchObject({ role: 'assistant', tool_calls: rows[1].tool_calls });
    expect(messages[2]).toMatchObject({ role: 'tool', tool_call_id: 'tc-1' });
  });
});

describe('runStreamingAgentTurn', () => {
  const serviceClient = {} as SupabaseClient;
  const events: Array<{ event: string; data: unknown }> = [];
  const send = (event: string, data: unknown) => {
    events.push({ event, data });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    events.length = 0;
  });

  it('runs propose_draft tool flow and emits tool_result', async () => {
    chat
      .mockResolvedValueOnce({
        content: '',
        tool_calls: [
          {
            id: 'tc-1',
            type: 'function',
            function: { name: 'propose_draft', arguments: '{"sectionKey":"childhood"}' },
          },
        ],
      })
      .mockResolvedValueOnce({ content: '' });

    executeCoachTool.mockResolvedValue({
      content: '{"preview":"Once upon a time..."}',
      event: { tool: 'propose_draft', sectionKey: 'childhood', contentLength: 21 },
    });

    async function* streamTokens() {
      yield { type: 'token', content: 'Here is a refined draft for childhood.' };
    }
    chatStream.mockReturnValue(streamTokens());

    await runStreamingAgentTurn(preparedBase, serviceClient, send);

    expect(executeCoachTool).toHaveBeenCalledWith(
      'propose_draft',
      '{"sectionKey":"childhood"}',
      expect.objectContaining({ biographyId: 'bio-1', userId: 'user-1' })
    );
    expect(events.some((e) => e.event === 'tool_result' && (e.data as { tool: string }).tool === 'propose_draft')).toBe(
      true
    );
    expect(events.some((e) => e.event === 'done')).toBe(true);
    expect(appendMessage).toHaveBeenCalled();
  });

  it('uses draft acknowledgment when model returns only propose_draft tool without text', async () => {
    const echoPrepared: PreparedAgentTurn = {
      ...preparedBase,
      agentType: 'echo',
      locale: 'it',
    };

    chat
      .mockResolvedValueOnce({
        content: '',
        tool_calls: [
          {
            id: 'tc-1',
            type: 'function',
            function: {
              name: 'propose_draft',
              arguments: '{"sectionKey":"childhood","draftText":"Era una bella infanzia."}',
            },
          },
        ],
      })
      .mockResolvedValueOnce({ content: '' })
      .mockResolvedValueOnce({ content: '' });

    executeEchoTool.mockResolvedValue({
      content: '{"ok":true,"preview":true}',
      event: {
        tool: 'propose_draft',
        sectionKey: 'childhood',
        draftText: 'Era una bella infanzia.',
        preview: true,
      },
    });

    async function* emptyStream() {
      yield { type: 'done' };
    }
    chatStream.mockReturnValue(emptyStream());

    await runStreamingAgentTurn(echoPrepared, serviceClient, send);

    expect(events.some((e) => e.event === 'token' && (e.data as { content: string }).content.includes('bozza'))).toBe(
      true
    );
    expect(events.some((e) => e.event === 'done')).toBe(true);
  });
});
