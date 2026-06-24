import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeScreeningVerdict,
  runPublicationScreening,
} from '@/lib/agents/screening/run-publication-screening';

const chat = vi.fn();

vi.mock('@/lib/agents/infomaniak-client', () => ({
  chat: (opts: unknown) => chat(opts),
}));

describe('normalizeScreeningVerdict', () => {
  it('parses valid screening JSON', () => {
    const result = normalizeScreeningVerdict({
      passages: [
        {
          text: 'He definitely stole the money.',
          section_key: 'career',
          reason: 'Unverified criminal accusation',
          severity: 3,
        },
      ],
      overall_severity: 3,
      summary: 'One serious issue',
    });

    expect(result?.passages).toHaveLength(1);
    expect(result?.overall_severity).toBe(3);
  });

  it('rejects invalid passage severity', () => {
    const result = normalizeScreeningVerdict({
      passages: [{ text: 'x', section_key: 'career', reason: 'y', severity: 9 }],
      overall_severity: 9,
    });
    expect(result?.passages).toHaveLength(0);
  });
});

describe('runPublicationScreening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INFOMANIAK_AI_TOKEN = 'test-token';
    process.env.INFOMANIAK_AI_ENDPOINT = 'https://ai.example/v1/chat/completions';
  });

  afterEach(() => {
    delete process.env.INFOMANIAK_AI_TOKEN;
    delete process.env.INFOMANIAK_AI_ENDPOINT;
  });

  it('calls Infomaniak chat with reviewer role (Gemma), never apertus', async () => {
    chat.mockResolvedValue({
      tool_calls: [
        {
          id: 'tc-1',
          type: 'function',
          function: {
            name: 'submit_screening_verdict',
            arguments: JSON.stringify({ passages: [], overall_severity: 0 }),
          },
        },
      ],
      content: '',
      modelUsed: 'google/gemma-4-31B-it',
    });

    const result = await runPublicationScreening('Biography body text', ['childhood']);
    expect(result.passages).toHaveLength(0);
    expect(result.aiError).toBeUndefined();
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'reviewer',
        tool_choice: { type: 'function', function: { name: 'submit_screening_verdict' } },
      })
    );
    expect(chat.mock.calls[0][0].role).not.toBe('apertus');
  });

  it('returns aiError when Infomaniak env is missing', async () => {
    delete process.env.INFOMANIAK_AI_TOKEN;
    const result = await runPublicationScreening('text');
    expect(result.aiError).toBe(true);
    expect(chat).not.toHaveBeenCalled();
  });
});
