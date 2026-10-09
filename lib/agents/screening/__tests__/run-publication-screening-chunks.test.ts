import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runPublicationScreening } from '@/lib/agents/screening/run-publication-screening';
import { MAX_CHUNK_CHARS } from '@/lib/agents/screening/chunk-limits';

const chat = vi.fn();

vi.mock('@/lib/agents/infomaniak-client', () => ({
  chat: (opts: unknown) => chat(opts),
}));

function cleanToolReply() {
  return {
    tool_calls: [
      {
        id: 'tc',
        type: 'function',
        function: {
          name: 'submit_screening_verdict',
          arguments: JSON.stringify({ passages: [], overall_severity: 0, summary: 'ok' }),
        },
      },
    ],
    content: '',
    modelUsed: 'google/gemma-4-31B-it',
  };
}

function flagToolReply(text: string, severity = 2) {
  return {
    tool_calls: [
      {
        id: 'tc',
        type: 'function',
        function: {
          name: 'submit_screening_verdict',
          arguments: JSON.stringify({
            passages: [
              {
                text,
                section_key: 'legacy',
                reason: 'test flag',
                severity,
              },
            ],
            overall_severity: severity,
            summary: 'flagged',
          }),
        },
      },
    ],
    content: '',
    modelUsed: 'google/gemma-4-31B-it',
  };
}

describe('runPublicationScreening a pezzi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INFOMANIAK_AI_TOKEN = 'test-token';
    process.env.INFOMANIAK_AI_ENDPOINT = 'https://ai.example/v1/chat/completions';
  });

  afterEach(() => {
    delete process.env.INFOMANIAK_AI_TOKEN;
    delete process.env.INFOMANIAK_AI_ENDPOINT;
  });

  it('un pezzo che fallisce impedisce l\'esito positivo (ai_error)', async () => {
    const bad = 'SECONDO_PEZZO_FALLISCE';
    const text = `${'alpha '.repeat(Math.ceil(MAX_CHUNK_CHARS / 6) + 10)}\n\n${bad}`;
    chat.mockImplementation(async (opts: unknown) => {
      const messages = (opts as { messages: { role: string; content: string }[] }).messages;
      const user = messages.find((m) => m.role === 'user')?.content ?? '';
      if (user.includes(bad)) return { content: 'no json', modelUsed: 'm' };
      return cleanToolReply();
    });

    const result = await runPublicationScreening(text);
    expect(result.aiError).toBe(true);
    expect(result.examinedChars ?? 0).toBe(0);
  });

  it('un rilievo nell\'ultimo pezzo di un testo lungo viene trovato', async () => {
    const marker = 'MARKER_LAST_CHUNK_UNIQUE_XYZ';
    const first = `${'word '.repeat(Math.ceil(MAX_CHUNK_CHARS / 5))}`;
    const text = `${first}\n\n${marker} accusation against a living person.`;
    chat.mockImplementation(async (opts: unknown) => {
      const messages = (opts as { messages: { role: string; content: string }[] }).messages;
      const user = messages.find((m) => m.role === 'user')?.content ?? '';
      if (user.includes(marker)) return flagToolReply(marker, 3);
      return cleanToolReply();
    });

    const result = await runPublicationScreening(text);
    expect(result.aiError).toBeUndefined();
    expect(result.overall_severity).toBe(3);
    expect(result.passages.some((p) => p.text.includes(marker))).toBe(true);
    const last = result.passages.find((p) => p.text.includes(marker));
    expect(last?.chunk_index).toBeGreaterThan(0);
  });

  it('testo vuoto: non chiama il modello e restituisce errore esplicito', async () => {
    const result = await runPublicationScreening('  \n  ');
    expect(result.aiError).toBe(true);
    expect(result.emptyText).toBe(true);
    expect(chat).not.toHaveBeenCalled();
  });

  it('tutti i pezzi puliti portano all\'esito positivo e examined_chars = source_chars', async () => {
    chat.mockResolvedValue(cleanToolReply());
    const text = `# Uno\n\n${'ciao '.repeat(300)}\n\n# Due\n\n${'mondo '.repeat(300)}`;
    const result = await runPublicationScreening(text);
    expect(result.aiError).toBeUndefined();
    expect(result.passages).toHaveLength(0);
    expect(result.examinedChars).toBe(text.length);
    expect(result.sourceChars).toBe(text.length);
    expect(result.chunksExamined).toBe(result.chunksTotal);
  });

  it('gli ultimi caratteri di un testo lungo arrivano davvero al modello', async () => {
    const tail = 'TAIL_CHARS_9876543210';
    const text = `${'x'.repeat(MAX_CHUNK_CHARS + 100)}\n\n${tail}`;
    const seen: string[] = [];
    chat.mockImplementation(async (opts: { messages: { role: string; content: string }[] }) => {
      const user = opts.messages.find((m) => m.role === 'user')?.content ?? '';
      seen.push(user);
      return cleanToolReply();
    });
    await runPublicationScreening(text);
    expect(seen.some((u) => u.includes(tail))).toBe(true);
  });

  it('accuse in didascalia, epigrafe e relazione: flagged con section_key giusti', async () => {
    const markers = {
      photo_captions: 'ACCUSA_CAPTION_NOME_INVENTATO',
      epigraph: 'ACCUSA_EPIGRAPH_NOME_INVENTATO',
      relations: 'ACCUSA_RELATION_NOME_INVENTATO',
    };
    const text = [
      `[SECTION: epigraph]\n${markers.epigraph}`,
      `[SECTION: photo_captions]\nfull-page: ${markers.photo_captions}`,
      `[SECTION: relations]\nrelation_label: ${markers.relations}`,
    ].join('\n\n');

    chat.mockImplementation(async (opts: unknown) => {
      const messages = (opts as { messages: { role: string; content: string }[] }).messages;
      const user = messages.find((m) => m.role === 'user')?.content ?? '';
      const passages: Array<{ text: string; section_key: string; reason: string; severity: number }> =
        [];
      for (const [section_key, marker] of Object.entries(markers)) {
        if (user.includes(marker)) {
          passages.push({
            text: marker,
            section_key,
            reason: 'hidden accusation',
            severity: 3,
          });
        }
      }
      return {
        tool_calls: [
          {
            id: 'tc',
            type: 'function',
            function: {
              name: 'submit_screening_verdict',
              arguments: JSON.stringify({
                passages,
                overall_severity: passages.length ? 3 : 0,
                summary: 'flags',
              }),
            },
          },
        ],
        content: '',
        modelUsed: 'm',
      };
    });

    const result = await runPublicationScreening(text);
    expect(result.aiError).toBeUndefined();
    expect(result.overall_severity).toBe(3);
    for (const [section_key, marker] of Object.entries(markers)) {
      expect(
        result.passages.some((p) => p.section_key === section_key && p.text.includes(marker))
      ).toBe(true);
    }
  });
});
