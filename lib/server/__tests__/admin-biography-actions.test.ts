import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb } from './helpers/fake-supabase';

const purge = vi.fn();
vi.mock('@/lib/agents/purge-agent-memory', () => ({
  purgeAgentMemoryForBiography: (...a: unknown[]) => purge(...a),
}));

import { applyAdminBiographyAction } from '@/lib/server/admin-biography-actions';
import { computePublicFingerprint, recordScreening } from '@/lib/server/publication-fingerprint';

const NOW = new Date('2026-09-30T12:00:00Z');

function makeDb(
  row: Record<string, unknown> = {},
  opts: { updateError?: string } = {}
): FakeDb {
  return createFakeDb(
    {
      biographies: [
        {
          id: 'b1',
          user_id: 'u1',
          status: 'under_review',
          title: 'Titolo',
          final_version: 'Testo esaminato',
          published_at: null,
          biography_type: 'autobiography',
          ...row,
        },
      ],
    },
    {
      failUpdate: (table, patch) =>
        opts.updateError && table === 'biographies' && patch.status === 'published' ? { message: opts.updateError } : null,
    }
  );
}

async function screened(db: FakeDb, verdict: 'passed' | 'flagged' = 'flagged') {
  const fingerprint = (await computePublicFingerprint(db.client, 'b1'))!;
  await recordScreening(db.client, { biographyId: 'b1', fingerprint, verdict, scope: 'full', examinedChars: 15, sourceChars: 15 });
  return fingerprint;
}

const biographyPatches = (db: FakeDb) =>
  db.log.filter((l) => l.op === 'update' && l.table === 'biographies').map((l) => l.data);

beforeEach(() => {
  purge.mockReset();
  purge.mockResolvedValue(undefined);
});

describe('applyAdminBiographyAction', () => {
  it('approva: pubblica e libera la presa in carico (con uno screening di questo testo)', async () => {
    const db = makeDb();
    await screened(db);
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'approve', actorId: 's1', now: NOW });
    expect(r).toEqual({ error: null, status: 'published' });
    expect(biographyPatches(db)[0]).toMatchObject({
      status: 'published',
      published_at: NOW.toISOString(),
      reviewed_by: null,
      reviewed_at: null,
    });
  });

  it('rifiuta: torna a draft e libera la presa in carico', async () => {
    const db = makeDb();
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'reject', actorId: 's1', now: NOW });
    expect(biographyPatches(db)[0]).toMatchObject({ status: 'draft', reviewed_by: null, reviewed_at: null });
  });

  it('prende in carico con l\'id dello staff', async () => {
    const db = makeDb();
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'claim_review', actorId: 's1', now: NOW });
    expect(biographyPatches(db)[0]).toMatchObject({ reviewed_by: 's1', reviewed_at: NOW.toISOString() });
  });

  it('congela e scongela', async () => {
    const db = makeDb();
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'freeze', actorId: 's1', now: NOW });
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'unfreeze', actorId: 's1', now: NOW });
    const [a, b] = biographyPatches(db);
    expect(a).toMatchObject({ is_frozen: true, frozen_at: NOW.toISOString(), frozen_reason: 'admin_action' });
    expect(b).toMatchObject({ is_frozen: false, frozen_at: null, frozen_reason: null });
  });

  it('pubblicazione forzata: il server scrive published_at e provisional_until la prima volta', async () => {
    const db = makeDb({ published_at: null, biography_type: 'memorial' });
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'force_publish', actorId: 's1', now: NOW });
    const patch = biographyPatches(db)[0];
    expect(patch.status).toBe('published');
    expect(patch.published_at).toBe(NOW.toISOString());
    expect(patch.provisional_until).toBeTruthy();
  });

  it('pubblicazione forzata su una scheda già pubblicata non cambia published_at', async () => {
    const db = makeDb({ published_at: '2026-01-01T00:00:00Z', biography_type: 'autobiography' });
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'force_publish', actorId: 's1', now: NOW });
    const { id: _id, ...patch } = biographyPatches(db)[0];
    expect(patch).toEqual({ status: 'published' });
  });

  it('rimuove e ripristina', async () => {
    const db = makeDb();
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'remove', actorId: 's1' });
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'restore', actorId: 's1' });
    expect(biographyPatches(db).map((p) => p.status)).toEqual(['removed', 'draft']);
  });

  it.each(['approve', 'force_publish'] as const)('%s: dopo la pubblicazione riuscita cancella la memoria di Echo', async (action) => {
    const db = makeDb();
    await screened(db);
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action, actorId: 's1', now: NOW });
    expect(purge).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledWith(db.client, 'b1');
  });

  it.each(['approve', 'force_publish'] as const)('%s: se la scrittura dello stato fallisce la memoria resta', async (action) => {
    const db = makeDb({}, { updateError: 'chapter_cooldown_active' });
    await screened(db);
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action, actorId: 's1', now: NOW });
    expect(r.error).toBe('chapter_cooldown_active');
    expect(purge).not.toHaveBeenCalled();
  });

  it.each(['reject', 'freeze', 'unfreeze', 'set_draft', 'remove', 'restore', 'claim_review'] as const)(
    '%s: non è una pubblicazione, non cancella la memoria e non scrive nel registro',
    async (action) => {
      const db = makeDb();
      await applyAdminBiographyAction(db.client, { biographyId: 'b1', action, actorId: 's1', now: NOW });
      expect(purge).not.toHaveBeenCalled();
      expect(db.tables.publication_records ?? []).toHaveLength(0);
    }
  );

  it('se la cancellazione della memoria fallisce la pubblicazione resta riuscita', async () => {
    purge.mockRejectedValue(new Error('boom'));
    const db = makeDb();
    await screened(db);
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'approve', actorId: 's1', now: NOW });
    expect(r).toEqual({ error: null, status: 'published' });
  });
});

describe('impronta del testo nelle azioni dello staff', () => {
  it('approva: rifiutata se il testo è cambiato dopo lo screening, con messaggio esplicito e nessuna scrittura', async () => {
    const db = makeDb();
    await screened(db);
    db.tables.biographies[0].final_version = 'Testo cambiato dopo lo screening';
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'approve', actorId: 's1', now: NOW });
    expect(r.blocked?.code).toBe('text_changed_since_screening');
    expect(r.error).toContain('screening');
    expect(biographyPatches(db)).toHaveLength(0);
    expect(purge).not.toHaveBeenCalled();
    expect(db.tables.publication_records).toHaveLength(1); // solo lo screening
  });

  it('approva: rifiutata se non c\'è nessuno screening registrato', async () => {
    const db = makeDb();
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'approve', actorId: 's1', now: NOW });
    expect(r.blocked?.code).toBe('no_screening_record');
    expect(biographyPatches(db)).toHaveLength(0);
  });

  it('pubblicazione forzata: passa anche con testo cambiato e senza screening, ma lascia impronta e autore', async () => {
    const db = makeDb();
    await screened(db);
    db.tables.biographies[0].final_version = 'Testo forzato, diverso da quello esaminato';
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'force_publish', actorId: 'staff-42', now: NOW });
    expect(r).toEqual({ error: null, status: 'published' });
    const publication = db.tables.publication_records.find((x) => x.kind === 'publication')!;
    expect(publication).toMatchObject({ mode: 'forced', actor_id: 'staff-42', outcome: 'published', biography_id: 'b1' });
    expect(publication.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(publication.fingerprint).not.toBe(publication.screening_fingerprint);
    expect(publication.screening_fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('pubblicazione forzata senza screening: la riga esiste, l\'impronta dello screening è vuota', async () => {
    const db = makeDb();
    await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'force_publish', actorId: 'staff-42', now: NOW });
    const publication = db.tables.publication_records[0];
    expect(publication).toMatchObject({ mode: 'forced', actor_id: 'staff-42', screening_fingerprint: null });
  });

  it('pubblicazione forzata: se la traccia non si può scrivere, non pubblica', async () => {
    const db = createFakeDb(
      { biographies: [{ id: 'b1', user_id: 'u1', status: 'under_review', final_version: 'x', published_at: null, biography_type: 'autobiography' }] },
      { failInsert: (table) => (table === 'publication_records' ? { message: 'db down' } : null) }
    );
    const r = await applyAdminBiographyAction(db.client, { biographyId: 'b1', action: 'force_publish', actorId: 's1', now: NOW });
    expect(r.error).toContain('publication_record_failed');
    expect(biographyPatches(db)).toHaveLength(0);
    expect(purge).not.toHaveBeenCalled();
  });
});
