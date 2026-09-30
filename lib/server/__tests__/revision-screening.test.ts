import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb } from './helpers/fake-supabase';

const screen = vi.fn(async (..._a: unknown[]) => ({ passages: [] as unknown[], overall_severity: 0 } as Record<string, unknown>));
const purge = vi.fn(async () => undefined);

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/agents/purge-agent-memory', () => ({ purgeAgentMemoryForBiography: (...a: unknown[]) => purge(...(a as [])) }));
vi.mock('@/lib/server/email/publication-helpers', () => ({
  notifyAuthorPublicationEmail: vi.fn(async () => undefined),
  notifyReviewerAssignedEmail: vi.fn(),
}));
vi.mock('@/lib/server/um-id-registry', () => ({ ensureUmIdFor: vi.fn(async () => ({})) }));
vi.mock('@/lib/server/archive-package-store', () => ({ syncArchivePackage: vi.fn(async () => undefined) }));
vi.mock('@/lib/agents/screening/run-publication-screening', () => ({
  runPublicationScreening: (...a: unknown[]) => screen(...a),
}));

import { screenRevisionAndAttach } from '@/lib/server/revision-screening';
import { applyAdminBiographyAction } from '@/lib/server/admin-biography-actions';

const TEXT = 'Testo corretto dall\'autore dopo la richiesta di revisione.';
const OLD_ANALYSIS = { summary: '1 passage(s) flagged by AI screening', flagged_passages: [{ text: 'vecchio', section_key: 'childhood', reason: 'r', level: 2 }] };

function makeDb(finalVersion = TEXT): FakeDb {
  return createFakeDb({
    biographies: [
      {
        id: 'b1',
        user_id: 'author-1',
        status: 'revision_pending_review',
        title: 'T',
        final_version: finalVersion,
        content: {},
        content_language: 'it',
        record_language_tag: 'it',
        biography_type: 'autobiography',
        published_at: '2026-01-01T00:00:00Z',
      },
    ],
    moderation_reports: [{ id: 'r1', biography_id: 'b1', status: 'decided', ai_analysis: OLD_ANALYSIS }],
  });
}

const attach = (db: FakeDb, reportId: string | null = 'r1') =>
  screenRevisionAndAttach(db.client, { biographyId: 'b1', reportId, authorId: 'author-1' });

beforeEach(() => {
  vi.clearAllMocks();
  screen.mockImplementation(async () => ({ passages: [], overall_severity: 0 }));
});

describe('correzione inviata: screening senza pubblicazione, esito allegato alla scheda', () => {
  it('esito pulito: registra l\'esame, allega il riassunto, non cambia lo stato', async () => {
    const db = makeDb();
    const r = await attach(db);
    expect(r).toEqual({ ok: true, verdict: 'passed' });

    expect(db.tables.biographies[0].status).toBe('revision_pending_review');
    expect(db.log.some((l) => l.op === 'update' && l.table === 'biographies')).toBe(false);

    const screening = db.tables.publication_records.find((x) => x.kind === 'screening')!;
    expect(screening).toMatchObject({ verdict: 'passed', scope: 'full', examined_chars: TEXT.length, source_chars: TEXT.length });

    const analysis = db.tables.moderation_reports[0].ai_analysis as Record<string, any>;
    expect(analysis.summary).toContain('no passage flagged');
    expect(analysis.flagged_passages).toEqual([]);
    expect(analysis.revision_screening).toMatchObject({ verdict: 'passed', fingerprint: screening.fingerprint, partial: false });
    expect(analysis.previous_analysis).toEqual(OLD_ANALYSIS);

    const message = db.tables.moderation_messages[0];
    expect(message).toMatchObject({ report_id: 'r1', is_internal: true });
  });

  it('passaggi segnalati: il pannello del revisore li vede', async () => {
    const db = makeDb();
    screen.mockImplementation(async () => ({
      passages: [{ text: 'frase', section_key: 'family', reason: 'motivo', severity: 3 }],
      overall_severity: 3,
    }));
    await attach(db);
    const analysis = db.tables.moderation_reports[0].ai_analysis as Record<string, any>;
    expect(analysis.flagged_passages).toEqual([{ text: 'frase', section_key: 'family', reason: 'motivo', level: 3 }]);
    expect(analysis.summary).toContain('flagged 1 passage');
    expect(db.tables.moderation_reports[0].ai_violation_level).toBe(3);
  });

  it('testo oltre la finestra del modello: lo dice, il revisore deve leggerlo tutto', async () => {
    const db = makeDb('a'.repeat(8_000));
    await attach(db);
    const analysis = db.tables.moderation_reports[0].ai_analysis as Record<string, any>;
    expect(analysis.revision_screening).toMatchObject({ partial: true, examined_chars: 6000, source_chars: 8000 });
    expect(analysis.summary).toContain('read the whole text before approving');
  });

  it('errore del modello: lo scrive, il revisore legge il testo per intero', async () => {
    const db = makeDb();
    screen.mockImplementation(async () => ({ passages: [], overall_severity: 0, aiError: true }));
    const r = await attach(db);
    expect(r.verdict).toBe('ai_error');
    expect((db.tables.moderation_reports[0].ai_analysis as Record<string, any>).summary).toContain('could not complete');
  });

  it('se lo screening non gira, non solleva e lascia scritto che va rilanciato', async () => {
    const db = createFakeDb(
      { biographies: [{ id: 'b1', user_id: 'author-1', status: 'revision_pending_review', final_version: TEXT, content_language: 'it', record_language_tag: 'it' }], moderation_reports: [{ id: 'r1', biography_id: 'b1', ai_analysis: OLD_ANALYSIS }] },
      { failInsert: (table) => (table === 'publication_records' ? { message: 'db down' } : null) }
    );
    const r = await attach(db);
    expect(r.ok).toBe(false);
    expect(db.tables.moderation_messages[0].message).toContain('could not run');
    expect((db.tables.moderation_reports[0].ai_analysis as Record<string, any>).previous_analysis).toBeUndefined();
  });

  it('senza un rapporto a cui allegare, registra comunque l\'esame', async () => {
    const db = makeDb();
    const r = await attach(db, null);
    expect(r.ok).toBe(true);
    expect(db.tables.publication_records).toHaveLength(1);
  });
});

describe('il revisore approva: pubblica solo se il testo è quello esaminato', () => {
  it('testo invariato dopo lo screening: l\'approvazione pubblica', async () => {
    const db = makeDb();
    await attach(db);
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'approve', actorId: 'rev-1' });
    expect(r).toEqual({ error: null, status: 'published' });
    expect(db.tables.biographies[0].status).toBe('published');
    const publication = db.tables.publication_records.find((x) => x.kind === 'publication')!;
    expect(publication).toMatchObject({ mode: 'human_approval', actor_id: 'rev-1', outcome: 'published' });
    expect(publication.fingerprint).toBe(publication.screening_fingerprint);
  });

  it('testo cambiato dopo lo screening: l\'approvazione è rifiutata e la scheda non esce', async () => {
    const db = makeDb();
    await attach(db);
    db.tables.biographies[0].final_version = 'Un altro testo, scritto dopo lo screening.';
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'approve', actorId: 'rev-1' });
    expect(r.blocked?.code).toBe('text_changed_since_screening');
    expect(db.tables.biographies[0].status).toBe('revision_pending_review');
    expect(db.tables.publication_records.some((x) => x.kind === 'publication')).toBe(false);
  });

  it('se lo screening non è girato: l\'approvazione chiede di rilanciarlo, la forzata resta possibile e lascia traccia', async () => {
    const db = makeDb();
    expect((await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'approve', actorId: 'rev-1' })).blocked?.code).toBe('no_screening_record');
    const forced = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'force_publish', actorId: 'rev-1' });
    expect(forced.error).toBeNull();
    expect(db.tables.publication_records.find((x) => x.kind === 'publication')).toMatchObject({ mode: 'forced', actor_id: 'rev-1' });
  });
});
