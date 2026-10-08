import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb } from './helpers/fake-supabase';

const log: string[] = [];
const purge = vi.fn(async () => {
  log.push('purge');
});
const notify = vi.fn(async () => {
  log.push('notify');
});
const ensureUm = vi.fn(async () => {
  log.push('um-id');
  return { umIdCanonical: 'UM-1' };
});
const screen = vi.fn(async (..._args: unknown[]) => ({ passages: [] as unknown[], overall_severity: 0 } as Record<string, unknown>));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/agents/purge-agent-memory', () => ({
  purgeAgentMemoryForBiography: (...a: unknown[]) => (purge as (...x: unknown[]) => Promise<void>)(...a),
}));
vi.mock('@/lib/server/email/publication-helpers', () => ({
  notifyAuthorPublicationEmail: (...a: unknown[]) => (notify as (...x: unknown[]) => Promise<void>)(...a),
  notifyReviewerAssignedEmail: vi.fn(),
}));
vi.mock('@/lib/server/um-id-registry', () => ({ ensureUmIdFor: (...a: unknown[]) => (ensureUm as (...x: unknown[]) => Promise<unknown>)(...a) }));
vi.mock('@/lib/server/archive-package-store', () => ({ syncArchivePackage: vi.fn(async () => undefined) }));
vi.mock('@/lib/agents/screening/run-publication-screening', () => ({
  runPublicationScreening: (...a: unknown[]) => screen(...a),
}));

import { runReviewSubmitScreening } from '@/lib/server/review-submit-pipeline';

const FINAL = 'Testo finale abbastanza lungo per lo screening.';

function makeDb(opts: { publishError?: string; finalVersion?: string } = {}): FakeDb {
  return createFakeDb(
    {
      biographies: [
        {
          id: 'bio-1',
          user_id: 'author-1',
          title: 'La mia vita',
          author_name: 'Anna',
          content: {},
          content_freeflow: '<p>Testo</p>',
          content_language: 'en',
          record_language_tag: 'en',
          final_version: opts.finalVersion ?? FINAL,
          biography_mode: 'freeflow',
          status: 'locked_pending_screening',
          biography_type: 'autobiography',
          published_at: null,
          provisional_until: null,
        },
      ],
    },
    {
      failUpdate: (table, patch) =>
        opts.publishError && table === 'biographies' && patch.status === 'published'
          ? { message: opts.publishError }
          : null,
      onUpdate: (table, patch) => {
        if (table === 'biographies' && patch.status === 'published') log.push('publish-update');
      },
    }
  );
}

beforeEach(() => {
  log.length = 0;
  vi.clearAllMocks();
  screen.mockImplementation(async () => ({ passages: [], overall_severity: 0 }));
});

describe('screening pulito e pubblicazione', () => {
  it('cancella la memoria di Echo solo dopo che la pubblicazione è riuscita', async () => {
    const db = makeDb();
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    expect(purge).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledWith(expect.anything(), 'bio-1');
    expect(log.indexOf('publish-update')).toBeGreaterThanOrEqual(0);
    expect(log.indexOf('purge')).toBeGreaterThan(log.indexOf('publish-update'));
  });

  it('se la scrittura dello stato fallisce (per esempio attesa fra capitoli) non dice "pubblicata" e la memoria resta', async () => {
    const db = makeDb({ publishError: 'chapter_cooldown_active' });
    await expect(runReviewSubmitScreening(db.client, 'bio-1')).rejects.toThrow('publish_failed');
    expect(purge).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    const publication = db.tables.publication_records.find((r) => r.kind === 'publication');
    expect(publication?.outcome).toBe('failed');
  });

  it('a ogni pubblicazione successiva lo fa di nuovo', async () => {
    const db = makeDb();
    await runReviewSubmitScreening(db.client, 'bio-1');
    await runReviewSubmitScreening(db.client, 'bio-1');
    expect(purge).toHaveBeenCalledTimes(2);
  });
});

describe('impronta: il testo pubblicato è quello esaminato', () => {
  it('registra lo screening con l\'impronta e poi la pubblicazione con la stessa', async () => {
    const db = makeDb();
    await runReviewSubmitScreening(db.client, 'bio-1');
    const [screening, publication] = db.tables.publication_records;
    expect(screening).toMatchObject({ kind: 'screening', verdict: 'passed', scope: 'full', biography_id: 'bio-1' });
    expect(screening.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(publication).toMatchObject({
      kind: 'publication',
      mode: 'auto',
      actor_id: null,
      outcome: 'published',
      fingerprint: screening.fingerprint,
      screening_fingerprint: screening.fingerprint,
    });
  });

  it('se il testo cambia mentre il modello lo esamina: non pubblica, niente identificativo UM, torna in coda con errore esplicito', async () => {
    const db = makeDb();
    screen.mockImplementation(async () => {
      db.tables.biographies[0].final_version = 'Testo RISCRITTO mentre il modello lavorava.';
      return { passages: [], overall_severity: 0 };
    });

    const result = await runReviewSubmitScreening(db.client, 'bio-1');

    expect(result).toMatchObject({
      result: 'under_review',
      screeningDetail: 'text_changed',
      message: 'text_changed_during_screening',
    });
    expect(log).not.toContain('publish-update');
    expect(ensureUm).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
    expect(db.tables.biographies[0].status).toBe('under_review');
    expect(db.tables.biographies[0].ai_screening_status).toBe('pending');

    const verdicts = db.tables.publication_records.filter((r) => r.kind === 'screening').map((r) => r.verdict);
    expect(verdicts).toEqual(['passed', 'text_changed']);
    expect(db.tables.publication_records.some((r) => r.kind === 'publication')).toBe(false);

    const report = db.tables.moderation_reports.find((r) => r.biography_id === 'bio-1');
    expect(report?.description).toContain('Text changed during screening');
  });

  it('se il testo non è cambiato, l\'identificativo UM si emette una volta e si pubblica', async () => {
    const db = makeDb();
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    expect(ensureUm).toHaveBeenCalledTimes(1);
    expect(log.indexOf('um-id')).toBeLessThan(log.indexOf('publish-update'));
  });

  it('un testo lungo: con pezzi tutti esaminati, examined_chars = source_chars e si pubblica', async () => {
    const long = 'a'.repeat(10_500);
    const db = makeDb({ finalVersion: long });
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    const screening = db.tables.publication_records.find((r) => r.kind === 'screening');
    expect(screening).toMatchObject({
      examined_chars: long.length,
      source_chars: long.length,
      scope: 'full',
    });
  });

  it('errore del modello: registra l\'esito, nessuna pubblicazione, revisione umana', async () => {
    const db = makeDb();
    screen.mockImplementation(async () => ({ passages: [], overall_severity: 0, aiError: true }));
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result).toMatchObject({ result: 'under_review', screeningDetail: 'ai_error' });
    expect(db.tables.publication_records.map((r) => r.verdict)).toEqual(['ai_error']);
    expect(log).not.toContain('publish-update');
    expect(db.tables.biographies[0].ai_screening_status).toBe('ai_error');
  });

  it('passaggi segnalati: registra "flagged" e non pubblica', async () => {
    const db = makeDb();
    screen.mockImplementation(async () => ({
      passages: [{ text: 'x', section_key: 'childhood', reason: 'r', severity: 2 }],
      overall_severity: 2,
    }));
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result).toMatchObject({ result: 'under_review', screeningDetail: 'flagged' });
    expect(db.tables.publication_records.map((r) => r.verdict)).toEqual(['flagged']);
    expect(log).not.toContain('publish-update');
  });

  it('se il registro non si scrive, non si pubblica', async () => {
    const db = createFakeDb(
      {
        biographies: [
          { id: 'bio-1', user_id: 'author-1', content: {}, content_language: 'en', record_language_tag: 'en', final_version: FINAL, biography_mode: 'freeflow', status: 'locked_pending_screening' },
        ],
      },
      { failInsert: (table) => (table === 'publication_records' ? { message: 'db down' } : null) }
    );
    await expect(runReviewSubmitScreening(db.client, 'bio-1')).rejects.toThrow('screening_record_failed');
    expect(log).not.toContain('publish-update');
  });
});

describe('regola di sicurezza: niente pubblicazione automatica se examined_chars < source_chars', () => {
  it('se lo screening riporta un esame parziale: coda umana, nessun UM', async () => {
    const db = makeDb({ finalVersion: 'a'.repeat(6_001) });
    screen.mockImplementation(async () => ({
      passages: [],
      overall_severity: 0,
      examinedChars: 100,
      sourceChars: 6_001,
    }));
    const result = await runReviewSubmitScreening(db.client, 'bio-1');

    expect(result).toMatchObject({
      result: 'under_review',
      screeningDetail: 'incomplete',
      message: 'screening_incomplete',
    });
    expect(log).not.toContain('publish-update');
    expect(ensureUm).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
    expect(db.tables.biographies[0].status).toBe('under_review');
    expect(db.tables.publication_records.some((r) => r.kind === 'publication')).toBe(false);

    const report = db.tables.moderation_reports.find((r) => r.biography_id === 'bio-1')!;
    expect(report.description).toContain('Incomplete screening');
    expect((report.ai_analysis as { summary: string }).summary).toContain('100 of 6001 characters');
    expect((report.ai_analysis as { summary: string }).summary).not.toMatch(/longer than/i);
  });

  it('quando examined_chars = source_chars si pubblica', async () => {
    const body = 'a'.repeat(6_000);
    const db = makeDb({ finalVersion: body });
    screen.mockImplementation(async () => ({
      passages: [],
      overall_severity: 0,
      examinedChars: body.length,
      sourceChars: body.length,
    }));
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    expect(db.tables.publication_records.find((r) => r.kind === 'screening')).toMatchObject({
      examined_chars: 6000,
      source_chars: 6000,
    });
  });

  it('un pezzo fallito (ai_error) non pubblica', async () => {
    const db = makeDb({ finalVersion: 'a'.repeat(9_000) });
    screen.mockImplementation(async () => ({
      passages: [],
      overall_severity: 0,
      aiError: true,
      examinedChars: 0,
      sourceChars: 9_000,
    }));
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result).toMatchObject({ result: 'under_review', screeningDetail: 'ai_error' });
  });

  it('passaggi segnalati restano prioritari sulla regola di lunghezza', async () => {
    const db = makeDb({ finalVersion: 'a'.repeat(9_000) });
    screen.mockImplementation(async () => ({
      passages: [{ text: 'x', section_key: 'childhood', reason: 'r', severity: 2 }],
      overall_severity: 2,
      examinedChars: 9_000,
      sourceChars: 9_000,
    }));
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result).toMatchObject({ result: 'under_review', screeningDetail: 'flagged' });
  });

  it('lo screening legge sempre il testo intero, anche dopo un rifiuto dello staff', async () => {
    const db = makeDb();
    db.tables.moderation_reports = [
      {
        id: 'old',
        biography_id: 'bio-1',
        status: 'decided',
        decision: 'request_edit',
        decided_at: '2026-09-01T00:00:00Z',
        moderator_notes: { rejectedPassages: [{ section_key: 'childhood', ai_reason: 'x' }] },
      },
    ];
    const result = await runReviewSubmitScreening(db.client, 'bio-1');
    expect(result.result).toBe('published');
    expect(screen).toHaveBeenCalledWith(FINAL, undefined, expect.objectContaining({ biographyId: 'bio-1' }));
    expect(db.tables.moderation_reports.find((r) => r.id === 'old')).toMatchObject({ decision: 'publish' });
    expect(db.tables.publication_records.find((r) => r.kind === 'screening')?.scope).toBe('full');
  });
});
