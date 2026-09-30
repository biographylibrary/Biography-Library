import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb } from './helpers/fake-supabase';

let db: FakeDb;
const purge = vi.fn(async () => undefined);

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/server/review-submit-pipeline', () => ({ buildServiceClient: () => db.client }));
vi.mock('@/lib/agents/purge-agent-memory', () => ({ purgeAgentMemoryForBiography: (...a: unknown[]) => purge(...(a as [])) }));
vi.mock('@/lib/server/email/publication-helpers', () => ({ notifyAuthorPublicationEmail: vi.fn(async () => undefined) }));
vi.mock('@/lib/server/moderation-register', () => ({ writeModerationMessage: vi.fn(async () => undefined) }));
vi.mock('@/lib/server/archive-package-store', () => ({ syncArchivePackage: vi.fn(async () => undefined) }));

import { serverSubmitDecision } from '@/lib/server/moderation-decide-pipeline';
import { computePublicFingerprint, recordScreening } from '@/lib/server/publication-fingerprint';

function seed() {
  db = createFakeDb({
    biographies: [
      {
        id: 'b1',
        user_id: 'author-1',
        status: 'under_review',
        title: 'T',
        final_version: 'Testo esaminato',
        biography_type: 'autobiography',
        published_at: null,
      },
    ],
    moderation_reports: [{ id: 'r1', biography_id: 'b1', status: 'assigned', reviewed_by: null }],
  });
}

async function screened() {
  const fingerprint = (await computePublicFingerprint(db.client, 'b1'))!;
  await recordScreening(db.client, { biographyId: 'b1', fingerprint, verdict: 'flagged', scope: 'full', examinedChars: 15, sourceChars: 15 });
}

const decide = (bioPatch: Record<string, unknown> | null, decision = 'publish') =>
  serverSubmitDecision({
    reportId: 'r1',
    biographyId: 'b1',
    authorId: 'author-1',
    decision: decision as never,
    bioPatch: bioPatch as never,
    notificationMessage: '',
    moderatorId: 'mod-9',
  });

beforeEach(() => {
  seed();
  purge.mockClear();
});

describe('decisione di moderazione: pubblicazione', () => {
  it('pubblica se lo screening ha esaminato questo testo, e lascia la traccia di chi ha deciso', async () => {
    await screened();
    const r = await decide({ status: 'published', published_at: '2026-09-30T10:00:00Z' });
    expect(r.error).toBeNull();
    expect(db.tables.biographies[0].status).toBe('published');
    expect(db.tables.moderation_reports[0].status).toBe('decided');
    const publication = db.tables.publication_records.find((x) => x.kind === 'publication')!;
    expect(publication).toMatchObject({ mode: 'human_approval', actor_id: 'mod-9', outcome: 'published' });
  });

  it('se il testo è cambiato dopo lo screening: niente pubblicazione, il rapporto resta aperto', async () => {
    await screened();
    db.tables.biographies[0].final_version = 'Testo riscritto dopo lo screening';
    const r = await decide({ status: 'published', published_at: '2026-09-30T10:00:00Z' });
    expect(r.blocked).toBe('text_changed_since_screening');
    expect(r.error).toContain('screening');
    expect(db.tables.biographies[0].status).toBe('under_review');
    expect(db.tables.moderation_reports[0].status).toBe('assigned');
    expect(purge).not.toHaveBeenCalled();
  });

  it('senza screening registrato non pubblica', async () => {
    const r = await decide({ status: 'published' });
    expect(r.blocked).toBe('no_screening_record');
    expect(db.tables.biographies[0].status).toBe('under_review');
  });

  it('le altre decisioni non passano dal confronto', async () => {
    const r = await decide({ status: 'removed' }, 'remove');
    expect(r.error).toBeNull();
    expect(db.tables.biographies[0].status).toBe('removed');
    expect(db.tables.publication_records ?? []).toHaveLength(0);
  });
});

describe('decisione di moderazione: il browser non sceglie le colonne', () => {
  it.each([
    ['final_version', { final_version: 'scritto dallo staff' }],
    ['title', { title: 'altro' }],
    ['user_id', { user_id: 'someone' }],
    ['um_id', { um_id: 'UM-1' }],
  ])('rifiuta la colonna %s', async (_col, patch) => {
    const r = await decide(patch);
    expect(r.error).toContain('Invalid patch column');
    expect(db.log.filter((l) => l.op === 'update' && l.table === 'biographies')).toHaveLength(0);
  });

  it('rifiuta uno stato fuori elenco', async () => {
    const r = await decide({ status: 'pdf_draft' });
    expect(r.error).toContain('Invalid patch status');
  });
});
