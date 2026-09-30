import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, chatStream, embed, extractTextContent } from '@/lib/agents/infomaniak-client';
import { setUsageSink, type AiUsageRecord } from '@/lib/ai/usage-recorder';

describe('extractTextContent', () => {
  it('returns plain strings unchanged', () => {
    expect(extractTextContent('Ciao mondo')).toBe('Ciao mondo');
  });

  it('joins multipart content arrays', () => {
    expect(extractTextContent([{ text: 'Hello ' }, { text: 'world' }])).toBe('Hello world');
  });

  it('handles null and undefined', () => {
    expect(extractTextContent(null)).toBe('');
    expect(extractTextContent(undefined)).toBe('');
  });
});

describe('registrazione del consumo: ogni chiamata a un modello lascia una riga', () => {
  const fetchMock = vi.fn();
  const rows: AiUsageRecord[] = [];

  function jsonResponse(body: unknown, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  }

  function sseResponse(lines: string[]) {
    const encoder = new TextEncoder();
    return {
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(lines.join('\n') + '\n'));
          controller.close();
        },
      }),
      text: async () => '',
    };
  }

  beforeEach(() => {
    rows.length = 0;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    process.env.INFOMANIAK_AI_TOKEN = 'test-token';
    process.env.INFOMANIAK_AI_BASE_URL = 'https://ai.example/v1';
    process.env.AGENT_SKIP_MODEL_CATALOG = 'true';
    setUsageSink(async (r) => {
      rows.push(r);
    });
  });

  afterEach(() => {
    setUsageSink(null);
    vi.unstubAllGlobals();
    delete process.env.INFOMANIAK_AI_TOKEN;
    delete process.env.INFOMANIAK_AI_BASE_URL;
    delete process.env.AGENT_SKIP_MODEL_CATALOG;
  });

  const ctx = { purpose: 'echo', userId: 'user-1', biographyId: 'bio-1' } as const;

  it('chat: registra prompt, completion e totale restituiti dal fornitore', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: 'ciao' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
      })
    );
    const result = await chat({ role: 'onboarding', messages: [{ role: 'user', content: 'hi' }], usage: ctx });
    expect(result.usage).toEqual({ prompt_tokens: 120, completion_tokens: 30, total_tokens: 150, estimated: false });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      purpose: 'echo',
      userId: 'user-1',
      biographyId: 'bio-1',
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
      estimated: false,
      ok: true,
    });
    expect(rows[0].model).toBeTruthy();
  });

  it('chat: senza usage nella risposta stima i caratteri diviso quattro e lo segna come stima', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: 'x'.repeat(40) } }] }));
    await chat({ role: 'onboarding', messages: [{ role: 'user', content: 'y'.repeat(80) }], usage: ctx });
    expect(rows[0]).toMatchObject({ promptTokens: 20, completionTokens: 10, totalTokens: 30, estimated: true, ok: true });
  });

  it('chat: il tentativo fallito e quello sul modello di ripiego lasciano una riga ciascuno', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
        })
      );
    const result = await chat({
      role: 'coach',
      model: 'primary-model',
      fallbackModel: 'fallback-model',
      messages: [{ role: 'user', content: 'hi' }],
      usage: ctx,
    });
    expect(result.modelUsed).toBe('fallback-model');
    expect(rows.map((r) => [r.model, r.ok])).toEqual([
      ['primary-model', false],
      ['fallback-model', true],
    ]);
    expect(rows[0].totalTokens).toBeUndefined();
    expect(rows[1].totalTokens).toBe(6);
  });

  it('chat: errore di rete registrato come tentativo fallito', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(
      chat({ role: 'onboarding', messages: [{ role: 'user', content: 'hi' }], usage: ctx, allowFallback: false })
    ).rejects.toThrow('network down');
    expect(rows).toHaveLength(1);
    expect(rows[0].ok).toBe(false);
  });

  it('chat con allowFallback false: un solo modello, nessun secondo tentativo nascosto', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
    await expect(
      chat({ role: 'reviewer', messages: [{ role: 'user', content: 'hi' }], usage: { purpose: 'preprint_check' }, allowFallback: false })
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].purpose).toBe('preprint_check');
  });

  it('chat con catena esplicita, nuovi tentativi e arresto sugli errori 4xx (come la grammatica)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'bad request' }, 400));
    await expect(
      chat({
        messages: [{ role: 'user', content: 'hi' }],
        models: ['a', 'b', 'c'],
        retry: { attempts: 3, baseDelayMs: 1 },
        stopOnClientError: true,
        usage: { purpose: 'grammar', userId: 'user-1' },
      })
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({}, 504))
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: '[]' } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })
      );
    const result = await chat({
      messages: [{ role: 'user', content: 'hi' }],
      models: ['a', 'b'],
      retry: { attempts: 3, baseDelayMs: 1 },
      stopOnClientError: true,
      usage: { purpose: 'grammar', userId: 'user-1' },
    });
    expect(result.modelUsed).toBe('b'); // tre tentativi su "a" finiti male, poi il ripiego
    const payloads = fetchMock.mock.calls.map((c) => JSON.parse(String(c[1]?.body)).model);
    expect(payloads).toEqual(['a', 'a', 'a', 'b']);
  });

  it('chatStream: chiede l\'uso con stream_options e lo registra', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Ciao "}}]}',
        'data: {"choices":[{"delta":{"content":"mondo"}}]}',
        'data: {"choices":[],"usage":{"prompt_tokens":200,"completion_tokens":40,"total_tokens":240}}',
        'data: [DONE]',
      ])
    );
    const chunks = [];
    for await (const c of chatStream({ role: 'onboarding', messages: [{ role: 'user', content: 'hi' }], usage: ctx })) {
      chunks.push(c);
    }
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(sent.stream).toBe(true);
    expect(sent.stream_options).toEqual({ include_usage: true });
    expect(chunks.filter((c) => c.type === 'token').map((c) => c.content).join('')).toBe('Ciao mondo');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ promptTokens: 200, completionTokens: 40, totalTokens: 240, estimated: false, ok: true });
  });

  it('chatStream: se il fornitore non restituisce l\'uso, stima i caratteri diviso quattro e lo segna', async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['data: {"choices":[{"delta":{"content":"' + 'a'.repeat(40) + '"}}]}', 'data: [DONE]'])
    );
    for await (const _ of chatStream({ role: 'onboarding', messages: [{ role: 'user', content: 'b'.repeat(80) }], usage: ctx })) {
      // consuma
    }
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ promptTokens: 20, completionTokens: 10, totalTokens: 30, estimated: true, ok: true });
  });

  it('chatStream: se stream_options viene rifiutato riprova senza e stima', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"error":"unknown field stream_options"}',
      })
      .mockResolvedValueOnce(sseResponse(['data: {"choices":[{"delta":{"content":"ok"}}]}', 'data: [DONE]']));
    for await (const _ of chatStream({ role: 'onboarding', messages: [{ role: 'user', content: 'hi' }], usage: ctx })) {
      // consuma
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).stream_options).toBeUndefined();
    expect(rows).toHaveLength(1);
    expect(rows[0].estimated).toBe(true);
  });

  it('embed: registra l\'uso con scopo embedding', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ embedding: [0.1, 0.2] }], usage: { prompt_tokens: 12, total_tokens: 12 } })
    );
    const vectors = await embed(['testo'], { purpose: 'embedding', userId: 'user-1', biographyId: 'bio-1' });
    expect(vectors).toEqual([[0.1, 0.2]]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ purpose: 'embedding', promptTokens: 12, totalTokens: 12, ok: true });
  });

  it('embed: anche una chiamata fallita lascia una riga', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'no' }, 500));
    await expect(embed(['testo'], { purpose: 'embedding' })).rejects.toThrow();
    expect(rows).toHaveLength(1);
    expect(rows[0].ok).toBe(false);
  });
});
