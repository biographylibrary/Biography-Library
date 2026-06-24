import { describe, expect, it } from 'vitest';
import {
  filterToolNoise,
  formatAgentMemoryBlock,
  parseCompressionResponse,
  splitMessagesForCompression,
  type MemoryMessageRow,
} from '@/lib/agents/thread-memory-format';

function msg(
  partial: Partial<MemoryMessageRow> & Pick<MemoryMessageRow, 'role' | 'content'>
): MemoryMessageRow {
  return {
    tool_calls: partial.tool_calls ?? null,
    created_at: partial.created_at ?? new Date().toISOString(),
    ...partial,
  };
}

describe('filterToolNoise', () => {
  it('keeps tool rows in the last few user turns', () => {
    const rows: MemoryMessageRow[] = [
      msg({ role: 'user', content: 'old question', created_at: '2026-01-01T00:00:00Z' }),
      msg({
        role: 'assistant',
        content: '',
        tool_calls: [{ id: '1' }],
        created_at: '2026-01-01T00:00:01Z',
      }),
      msg({ role: 'tool', content: '{"ok":true}', created_at: '2026-01-01T00:00:02Z' }),
      msg({ role: 'user', content: 'recent', created_at: '2026-01-02T00:00:00Z' }),
      msg({
        role: 'assistant',
        content: '',
        tool_calls: [{ id: '2' }],
        created_at: '2026-01-02T00:00:01Z',
      }),
      msg({ role: 'tool', content: '{"ok":true}', created_at: '2026-01-02T00:00:02Z' }),
      msg({ role: 'assistant', content: 'answer', created_at: '2026-01-02T00:00:03Z' }),
    ];

    const filtered = filterToolNoise(rows, 1);
    expect(filtered.some((r) => r.role === 'tool' && r.created_at.startsWith('2026-01-01'))).toBe(
      false
    );
    expect(filtered.filter((r) => r.role === 'tool')).toHaveLength(1);
  });
});

describe('formatAgentMemoryBlock', () => {
  it('returns empty string when no memory exists', () => {
    expect(formatAgentMemoryBlock('', {})).toBe('');
  });

  it('formats summary and structured facts', () => {
    const block = formatAgentMemoryBlock('We discussed childhood school years.', {
      currentFocus: { sectionKey: 'childhood', topic: 'elementary school' },
      people: [{ name: 'Maria', relation: 'mother' }],
      openThreads: ['missing move date'],
    });

    expect(block).toContain('Conversation summary');
    expect(block).toContain('childhood');
    expect(block).toContain('Maria (mother)');
    expect(block).toContain('missing move date');
  });
});

describe('splitMessagesForCompression', () => {
  it('splits older conversational rows from the recent window', () => {
    const rows: MemoryMessageRow[] = Array.from({ length: 5 }, (_, i) =>
      msg({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `m${i}`,
        created_at: `2026-01-0${i + 1}T00:00:00Z`,
      })
    );

    const { toCompress, toKeep } = splitMessagesForCompression(rows, 2);
    expect(toCompress).toHaveLength(3);
    expect(toKeep).toHaveLength(2);
  });
});

describe('parseCompressionResponse', () => {
  it('parses JSON summary and facts from model output', () => {
    const parsed = parseCompressionResponse(
      `Here you go:
{
  "summary": "User is writing about childhood.",
  "facts": {
    "currentFocus": { "sectionKey": "childhood", "topic": "school" },
    "openThreads": ["dates for Zurich move"]
  }
}`,
      1500
    );

    expect(parsed?.summary).toContain('childhood');
    expect(parsed?.facts.currentFocus?.sectionKey).toBe('childhood');
    expect(parsed?.facts.openThreads).toEqual(['dates for Zurich move']);
  });
});
