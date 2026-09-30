import { beforeEach, describe, expect, it, vi } from 'vitest';

const log: string[] = [];
const purge = vi.fn(async () => {
  log.push('purge');
});
const notify = vi.fn(async () => {
  log.push('notify');
});

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/agents/purge-agent-memory', () => ({
  purgeAgentMemoryForBiography: (...a: unknown[]) => (purge as (...x: unknown[]) => Promise<void>)(...a),
}));
vi.mock('@/lib/server/email/publication-helpers', () => ({
  notifyAuthorPublicationEmail: (...a: unknown[]) => (notify as (...x: unknown[]) => Promise<void>)(...a),
  notifyReviewerAssignedEmail: vi.fn(),
}));
vi.mock('@/lib/server/um-id-registry', () => ({ ensureUmIdFor: vi.fn(async () => ({ umIdCanonical: 'UM-1' })) }));
vi.mock('@/lib/server/archive-package-store', () => ({ syncArchivePackage: vi.fn(async () => undefined) }));
vi.mock('@/lib/agents/screening/run-publication-screening', () => ({
  runPublicationScreening: vi.fn(async () => ({ passages: [], overall_severity: 0 })),
}));

import { runReviewSubmitScreening, type AnyClient } from '@/lib/server/review-submit-pipeline';

const BIO_ROW = {
  user_id: 'author-1',
  content: {},
  content_freeflow: '<p>Testo</p>',
  content_language: 'en',
  record_language_tag: 'en',
  final_version: 'Testo finale abbastanza lungo per lo screening.',
  biography_mode: 'freeflow',
  status: 'locked_pending_screening',
  biography_type: 'autobiography',
  published_at: null,
  provisional_until: null,
};

function fakeService(publishError: { message: string } | null) {
  const from = (table: string) => {
    const state: { op: string; patch?: Record<string, unknown> } = { op: 'select' };
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'order', 'limit', 'not', 'is', 'or']) chain[m] = () => chain;
    chain.update = (patch: Record<string, unknown>) => {
      state.op = 'update';
      state.patch = patch;
      return chain;
    };
    chain.insert = () => {
      state.op = 'insert';
      return chain;
    };
    const readRow = async () => ({ data: table === 'biographies' ? BIO_ROW : null, error: null });
    chain.maybeSingle = readRow;
    chain.single = readRow;
    chain.then = (resolve: (v: unknown) => void) => {
      if (state.op === 'update' && table === 'biographies' && state.patch?.status === 'published') {
        log.push('publish-update');
        return resolve({ error: publishError });
      }
      return resolve({ data: [], error: null });
    };
    return chain;
  };
  return { from } as unknown as AnyClient;
}

beforeEach(() => {
  log.length = 0;
  vi.clearAllMocks();
});

describe('screening pulito e pubblicazione', () => {
  it('cancella la memoria di Echo solo dopo che la pubblicazione è riuscita', async () => {
    const result = await runReviewSubmitScreening(fakeService(null), 'bio-1');
    expect(result.result).toBe('published');
    expect(purge).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledWith(expect.anything(), 'bio-1');
    expect(log.indexOf('publish-update')).toBeGreaterThanOrEqual(0);
    expect(log.indexOf('purge')).toBeGreaterThan(log.indexOf('publish-update'));
  });

  it('se la scrittura dello stato fallisce (per esempio attesa fra capitoli) non dice "pubblicata" e la memoria resta', async () => {
    await expect(
      runReviewSubmitScreening(fakeService({ message: 'chapter_cooldown_active' }), 'bio-1')
    ).rejects.toThrow('publish_failed');
    expect(purge).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('a ogni pubblicazione successiva lo fa di nuovo', async () => {
    await runReviewSubmitScreening(fakeService(null), 'bio-1');
    await runReviewSubmitScreening(fakeService(null), 'bio-1');
    expect(purge).toHaveBeenCalledTimes(2);
  });
});
