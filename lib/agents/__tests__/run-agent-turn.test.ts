import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  historyToChatMessages,
  normalizeToolMessages,
  runStreamingAgentTurn,
  type PreparedAgentTurn,
} from '@/lib/agents/run-agent-turn';

const appendMessage = vi.fn().mockResolvedValue({ id: 'msg-1' });
const updateAssistantMessageContent = vi.fn().mockResolvedValue({ id: 'msg-1', content: 'ack' });
const maybeCompressThreadMemory = vi.fn().mockResolvedValue(undefined);
const chat = vi.fn();
const chatStream = vi.fn();
const executeEchoTool = vi.fn();

vi.mock('@/lib/agents/thread-service', () => ({
  appendMessage: (...args: unknown[]) => appendMessage(...args),
  updateAssistantMessageContent: (...args: unknown[]) => updateAssistantMessageContent(...args),
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

vi.mock('@/lib/agents/tools/echo-tools', () => ({
  executeEchoTool: (...args: unknown[]) => executeEchoTool(...args),
}));

const preparedBase: PreparedAgentTurn = {
  threadId: 'thread-1',
  history: [],
  userMessage: 'Help me write childhood section',
  systemPrompt: 'You are Echo',
  role: 'coach',
  agentType: 'echo',
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

  it('drops a tool call that has no answer, and keeps the written reply', () => {
    const messages = normalizeToolMessages([
      { role: 'user', content: 'ciao' },
      {
        role: 'assistant',
        content: 'Guardo il testo.',
        tool_calls: [{ id: 'tc-missing', type: 'function', function: { name: 'propose_draft', arguments: '{}' } }],
      },
      { role: 'user', content: 'continua' },
    ]);
    expect(messages.map((row) => row.role)).toEqual(['user', 'assistant', 'user']);
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Guardo il testo.' });
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

    executeEchoTool.mockResolvedValue({
      content: '{"preview":"Once upon a time..."}',
      event: { tool: 'propose_draft', sectionKey: 'childhood', contentLength: 21 },
    });

    async function* streamTokens() {
      yield { type: 'token', content: 'Here is a refined draft for childhood.' };
    }
    chatStream.mockReturnValue(streamTokens());

    await runStreamingAgentTurn(preparedBase, serviceClient, send);

    expect(executeEchoTool).toHaveBeenCalledWith(
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

  it('riconosce la chiamata a propose_draft scritta come testo e fa comparire la scheda con «Inserisci»', async () => {
    const textual = [
      'That is a beautiful and generous motivation to begin with.',
      '',
      'propose_draft(sectionKey="freeflow", draftText="Un testo proposto.")',
      '',
      'I have drafted a passage based on your words.',
    ].join('\n');

    chat
      .mockResolvedValueOnce({ content: textual })
      .mockResolvedValueOnce({ content: '' })
      .mockResolvedValueOnce({ content: '' });

    executeEchoTool.mockResolvedValue({
      content: '{"ok":true,"preview":true}',
      event: { tool: 'propose_draft', sectionKey: 'freeflow', draftText: 'Un testo proposto.', preview: true },
    });

    async function* emptyStream() {
      yield { type: 'done' };
    }
    chatStream.mockReturnValue(emptyStream());

    await runStreamingAgentTurn({ ...preparedBase, locale: 'it' }, serviceClient, send);

    // La chiamata viene eseguita come se fosse arrivata nel campo delle chiamate.
    expect(executeEchoTool).toHaveBeenCalledTimes(1);
    expect(executeEchoTool).toHaveBeenCalledWith(
      'propose_draft',
      '{"sectionKey":"freeflow","draftText":"Un testo proposto."}',
      expect.objectContaining({ biographyId: 'bio-1', userId: 'user-1' })
    );
    // L'evento che disegna la scheda con il pulsante parte, legato al messaggio salvato.
    const toolResult = events.find((e) => e.event === 'tool_result');
    expect(toolResult?.data).toMatchObject({ tool: 'propose_draft', preview: true, assistantMessageId: 'msg-1' });
    // Nel chat non resta la riga con la chiamata, restano le frasi attorno.
    const shown = events
      .filter((e) => e.event === 'token')
      .map((e) => (e.data as { content: string }).content)
      .join('\n');
    expect(shown).not.toContain('propose_draft(');
    expect(shown).toContain('beautiful and generous motivation');
    expect(shown).toContain('I have drafted a passage');
    // Salvata come chiamata vera (serve alla ripresa della conversazione), senza la riga di testo.
    const savedAssistant = appendMessage.mock.calls
      .map((call) => call[2] as { role: string; content: string; tool_calls?: unknown })
      .find((row) => row.role === 'assistant' && Array.isArray(row.tool_calls));
    expect(savedAssistant?.content).not.toContain('propose_draft(');
    expect(savedAssistant?.tool_calls).toHaveLength(1);
    expect(events.some((e) => e.event === 'done')).toBe(true);
  });

  it('non esegue nulla se il nome dello strumento compare solo dentro una frase', async () => {
    chat.mockResolvedValueOnce({
      content: 'Quando serve uso propose_draft(sectionKey="freeflow", draftText="X") per proporti un testo.',
    });

    await runStreamingAgentTurn(preparedBase, serviceClient, send);

    expect(executeEchoTool).not.toHaveBeenCalled();
    expect(events.some((e) => e.event === 'tool_result')).toBe(false);
    expect(events.some((e) => e.event === 'done')).toBe(true);
  });

  it('se la proposta di testo fallisce, l\'app lo dice anche quando il modello scrive di averla fatta', async () => {
    const failing = [
      { id: 'tc-1', type: 'function', function: { name: 'propose_draft', arguments: '{"sectionKey":"freeflow","draftText":"x","replaceText":"non c\'è"}' } },
    ];
    chat
      .mockResolvedValueOnce({ content: 'Cancello subito la frase.', tool_calls: failing })
      .mockResolvedValueOnce({ content: 'Fatto, ho cancellato la frase dal testo.' });
    executeEchoTool.mockResolvedValue({ content: '{"error":"replaceText was not found in the document, so nothing was proposed."}' });

    await runStreamingAgentTurn({ ...preparedBase, locale: 'it' }, serviceClient, send);

    const shown = events
      .filter((e) => e.event === 'token')
      .map((e) => (e.data as { content: string }).content)
      .join('');
    // Le parole del modello restano, e l'ultima parola è dell'app.
    expect(shown).toContain('Fatto, ho cancellato la frase dal testo.');
    expect(shown.trimEnd().endsWith('quindi il tuo testo non è cambiato. Dimmi con parole tue il punto esatto da cambiare e riprovo.')).toBe(true);
    expect(events.some((e) => e.event === 'tool_result')).toBe(false);
    // Anche il messaggio salvato nella conversazione contiene l'avviso.
    const saved = appendMessage.mock.calls
      .map((call) => call[2] as { role: string; content: string })
      .filter((row) => row.role === 'assistant')
      .map((row) => row.content)
      .join('\n');
    expect(saved).toContain('il tuo testo non è cambiato');
  });

  it('l\'avviso c\'è anche quando il modello risponde subito con un testo dopo l\'errore, in inglese per le altre lingue', async () => {
    chat
      .mockResolvedValueOnce({
        content: '',
        tool_calls: [{ id: 'tc-1', type: 'function', function: { name: 'propose_draft', arguments: '{"sectionKey":"freeflow","draftText":"x","replaceText":"y"}' } }],
      })
      .mockResolvedValueOnce({ content: 'Done, the sentence is gone.' });
    executeEchoTool.mockResolvedValue({ content: '{"error":"replaceText was not found in the document"}' });

    await runStreamingAgentTurn(preparedBase, serviceClient, send);

    const shown = events.filter((e) => e.event === 'token').map((e) => (e.data as { content: string }).content).join('');
    expect(shown).toContain('Done, the sentence is gone.');
    expect(shown).toContain('your text has not been changed');
  });

  it('nessun avviso se dopo un primo errore il modello riprova e la scheda compare', async () => {
    const call = (id: string, replaceText: string) => ({
      id,
      type: 'function',
      function: { name: 'propose_draft', arguments: JSON.stringify({ sectionKey: 'freeflow', draftText: 'Fu in quel contesto', replaceText }) },
    });
    chat
      .mockResolvedValueOnce({ content: '', tool_calls: [call('tc-1', 'pezzo sbagliato unito a caso')] })
      .mockResolvedValueOnce({ content: '', tool_calls: [call('tc-2', 'questo è un testo di prova Fu in quel contesto')] })
      .mockResolvedValueOnce({ content: 'Ecco la modifica.' });
    executeEchoTool
      .mockResolvedValueOnce({ content: '{"error":"replaceText was not found in the document"}' })
      .mockResolvedValueOnce({
        content: '{"ok":true,"preview":true}',
        event: { tool: 'propose_draft', sectionKey: 'freeflow', draftText: 'Fu in quel contesto', replaceText: 'questo è un testo di prova Fu in quel contesto', preview: true },
      });

    await runStreamingAgentTurn({ ...preparedBase, locale: 'it' }, serviceClient, send);

    expect(executeEchoTool).toHaveBeenCalledTimes(2);
    expect(events.filter((e) => e.event === 'tool_result')).toHaveLength(1);
    const shown = events.filter((e) => e.event === 'token').map((e) => (e.data as { content: string }).content).join('');
    expect(shown).not.toContain('non è cambiato');
  });

  it('uses draft acknowledgment when model returns only propose_draft tool without text', async () => {
    const echoPrepared: PreparedAgentTurn = {
      ...preparedBase,
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
    expect(updateAssistantMessageContent).toHaveBeenCalledWith(
      serviceClient,
      'msg-1',
      expect.stringContaining('bozza')
    );
    expect(appendMessage).toHaveBeenCalled();
  });
});
