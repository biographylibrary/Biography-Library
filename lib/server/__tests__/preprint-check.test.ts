import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb } from './helpers/fake-supabase';
import { MAX_CHUNK_CHARS } from '@/lib/agents/screening/chunk-limits';
import {
  canRunPreprintCheck,
  mergePreprintFeedback,
  recordPreprintCheckRun,
  runPreprintCheck,
  type PreprintFeedback,
} from '@/lib/server/preprint-check';

const chat = vi.fn();

vi.mock('@/lib/agents/infomaniak-client', () => ({
  chat: (opts: unknown) => chat(opts),
}));

function cleanReply(quality = 4) {
  return {
    content: JSON.stringify({
      overall_quality: quality,
      strengths: ['voce'],
      suggestions: [
        { type: 'clarity', section_key: null, text: 'suggerimento' },
      ],
      red_flags: [],
      ready_for_publication: true,
    }),
    modelUsed: 'google/gemma-4-31B-it',
  };
}

describe('runPreprintCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INFOMANIAK_AI_TOKEN = 't';
    process.env.INFOMANIAK_AI_ENDPOINT = 'https://ai.example/v1/chat/completions';
    delete process.env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE;
  });

  afterEach(() => {
    delete process.env.INFOMANIAK_AI_TOKEN;
    delete process.env.INFOMANIAK_AI_ENDPOINT;
    delete process.env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE;
  });

  it('registra lo scopo preprint_check e non ripiega su un secondo modello', async () => {
    chat.mockResolvedValue(cleanReply());
    const feedback = await runPreprintCheck('My life story', 'it', {
      userId: 'author-1',
      biographyId: 'bio-1',
    });
    expect(feedback.aiError).toBeUndefined();
    expect(chat.mock.calls[0][0].usage).toEqual({
      purpose: 'preprint_check',
      userId: 'author-1',
      biographyId: 'bio-1',
    });
    expect(chat.mock.calls[0][0].allowFallback).toBe(false);
  });

  it('testo vuoto: non chiama il modello e restituisce errore esplicito', async () => {
    const feedback = await runPreprintCheck('   \n\t  ', 'it');
    expect(feedback.aiError).toBe(true);
    expect(feedback.emptyText).toBe(true);
    expect(chat).not.toHaveBeenCalled();
  });

  it('fonde i risultati di più pezzi', async () => {
    process.env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE = '80';
    chat.mockResolvedValue(cleanReply(5));
    const text = `${'parola '.repeat(40)}\n\n${'altra '.repeat(40)}`;
    const feedback = await runPreprintCheck(text, 'it');
    expect(feedback.aiError).toBeUndefined();
    expect(feedback.chunksTotal).toBeGreaterThan(1);
    expect(feedback.suggestions.length).toBeGreaterThanOrEqual(feedback.chunksTotal!);
    expect(chat.mock.calls.length).toBe(feedback.chunksTotal);
  });

  it('un pezzo che fallisce produce aiError', async () => {
    process.env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE = String(Math.min(200, MAX_CHUNK_CHARS));
    chat.mockImplementation(async (opts: unknown) => {
      const messages = (opts as { messages: { role: string; content: string }[] }).messages;
      const user = messages.find((m) => m.role === 'user')?.content ?? '';
      if (user.includes('SECONDO')) return { content: 'not json', modelUsed: 'm' };
      return cleanReply();
    });
    const text = `${'alpha '.repeat(80)}\n\nSECONDO pezzo qui`;
    const feedback = await runPreprintCheck(text, 'en');
    expect(feedback.aiError).toBe(true);
  });
});

describe('mergePreprintFeedback', () => {
  it('unisce suggerimenti e medie di qualità', () => {
    const a: PreprintFeedback = {
      overall_quality: 4,
      strengths: ['a'],
      suggestions: [{ type: 'style', section_key: null, text: 'uno', chunk_index: 0 }],
      red_flags: [],
      ready_for_publication: true,
    };
    const b: PreprintFeedback = {
      overall_quality: 2,
      strengths: ['b'],
      suggestions: [{ type: 'clarity', section_key: null, text: 'due', chunk_index: 1 }],
      red_flags: [{ section_key: null, issue: 'x', severity: 2, chunk_index: 1 }],
      ready_for_publication: false,
    };
    const merged = mergePreprintFeedback([a, b]);
    expect(merged.overall_quality).toBe(3);
    expect(merged.suggestions).toHaveLength(2);
    expect(merged.red_flags).toHaveLength(1);
    expect(merged.ready_for_publication).toBe(false);
  });
});

describe('limiti del controllo finale', () => {
  it('non si ripete sulla stessa impronta del contenuto', async () => {
    const fp = 'a'.repeat(64);
    const db = createFakeDb({
      preprint_check_runs: [
        {
          id: 'r1',
          biography_id: 'bio-1',
          content_fingerprint: fp,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const limit = await canRunPreprintCheck(db.client, 'bio-1', fp);
    expect(limit).toEqual({ ok: false, reason: 'same_fingerprint' });
  });

  it('terza esecuzione in 30 giorni consentita, quarta rifiutata', async () => {
    const now = new Date().toISOString();
    const db = createFakeDb({
      preprint_check_runs: [
        { id: '1', biography_id: 'bio-1', content_fingerprint: '1'.repeat(64), created_at: now },
        { id: '2', biography_id: 'bio-1', content_fingerprint: '2'.repeat(64), created_at: now },
      ],
    });
    const thirdFp = '3'.repeat(64);
    expect(await canRunPreprintCheck(db.client, 'bio-1', thirdFp)).toEqual({ ok: true });
    await recordPreprintCheckRun(db.client, 'bio-1', thirdFp);
    const fourthFp = '4'.repeat(64);
    expect(await canRunPreprintCheck(db.client, 'bio-1', fourthFp)).toEqual({
      ok: false,
      reason: 'window_exhausted',
    });
  });

  it('lookup fallita: lookup_failed (non lascia passare)', async () => {
    const db = createFakeDb(
      { preprint_check_runs: [] },
      {
        // force maybeSingle path via failInsert unused — use custom from override
      }
    );
    // Simula errore sulla select: sostituisce il client.from
    const broken = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: { message: 'db down' } }),
              }),
            }),
          }),
        }),
      }),
    };
    const limit = await canRunPreprintCheck(broken as never, 'bio-1', 'a'.repeat(64));
    expect(limit).toEqual({ ok: false, reason: 'lookup_failed' });
    expect(db.tables.preprint_check_runs).toHaveLength(0);
  });

  it('registra una nuova esecuzione', async () => {
    const db = createFakeDb({ preprint_check_runs: [] });
    const fp = 'b'.repeat(64);
    await recordPreprintCheckRun(db.client, 'bio-1', fp);
    expect(db.tables.preprint_check_runs).toHaveLength(1);
    expect(db.tables.preprint_check_runs[0].content_fingerprint).toBe(fp);
  });
});
