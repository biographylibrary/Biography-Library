import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

vi.mock('@/lib/agents/infomaniak-client', () => ({
  embed: vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])),
}));

vi.mock('@/lib/help/manual-meta.generated', () => ({
  MANUAL_META: {
    version: '9.9',
    date: '2026-10-15',
    hash: 'hash-build',
    languages: { en: { version: '9.9', date: '2026-10-15', hash: 'hash-build' } },
  },
}));

import { expectedKbChunkKeys, pruneStaleKbChunks } from '@/lib/agents/rag/kb-rag';
import { HELP_KB_SECTIONS } from '@/lib/agents/kb/help-kb-sections';

let db: FakeDb;

beforeEach(() => {
  db = createFakeDb({ kb_chunks: [] });
});

describe('pruneStaleKbChunks orphan chunk_index', () => {
  it('expectedKbChunkKeys includes every current split triple', () => {
    const keys = expectedKbChunkKeys(['en']);
    expect(keys.size).toBeGreaterThan(HELP_KB_SECTIONS.length);
    expect([...keys].some((k) => k.startsWith('en\0writing_modes\0'))).toBe(true);
  });

  it('elimina frammenti con chunk_index non più atteso (prova di rottura se prune sparisce)', async () => {
    const sourceKey = HELP_KB_SECTIONS[0].sourceKey;
    db = createFakeDb({
      kb_chunks: [
        { id: 'keep', locale: 'en', source_key: sourceKey, chunk_index: 0, content: 'a', text_hash: '1' },
        { id: 'orphan', locale: 'en', source_key: sourceKey, chunk_index: 99, content: 'old', text_hash: '2' },
        { id: 'stale-key', locale: 'en', source_key: 'removed_section', chunk_index: 0, content: 'x', text_hash: '3' },
      ],
    });

    const removed = await pruneStaleKbChunks(db.client);
    expect(removed).toBeGreaterThanOrEqual(2);
    const ids = db.tables.kb_chunks.map((r) => r.id);
    expect(ids).toContain('keep');
    expect(ids).not.toContain('orphan');
    expect(ids).not.toContain('stale-key');
  });
});
