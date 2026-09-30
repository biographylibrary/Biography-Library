import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

let db: FakeDb;
const getUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock('@/lib/server/service-client', () => ({ buildServiceClient: () => db.client }));

import { POST } from '@/app/api/biography/reopen/route';
import { reopenPublishedBiography } from '@/lib/server/biography-reopen';

const req = (body: unknown = { biographyId: 'b1' }, auth = 'Bearer jwt') =>
  new NextRequest('http://localhost/api/biography/reopen', {
    method: 'POST',
    headers: auth ? { authorization: auth } : {},
    body: JSON.stringify(body),
  });

const NOW = new Date('2026-09-30T12:00:00Z');
const PAST = '2026-01-01T00:00:00Z';
const FUTURE = '2027-03-01T00:00:00Z';

function seed(row: Record<string, unknown> = {}) {
  db = createFakeDb({
    biographies: [
      { id: 'b1', user_id: 'owner-1', status: 'published', is_frozen: false, next_chapter_available_at: PAST, ...row },
    ],
  });
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
  seed();
});

describe('POST /api/biography/reopen', () => {
  it('riapre la propria scheda pubblicata quando l\'attesa è trascorsa', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: 'draft' });
    expect(db.tables.biographies[0].status).toBe('draft');
  });

  it('senza attesa registrata (scheda mai pubblicata con il capitolo) riapre', async () => {
    seed({ next_chapter_available_at: null });
    expect((await POST(req())).status).toBe(200);
  });

  it('prima della fine dei 365 giorni: 409, dice da quando, la scheda resta pubblicata', async () => {
    seed({ next_chapter_available_at: FUTURE });
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'chapter_cooldown_active', availableAt: FUTURE });
    expect(db.tables.biographies[0].status).toBe('published');
    expect(db.log.filter((l) => l.op === 'update')).toHaveLength(0);
  });

  it.each(['draft', 'under_review', 'locked_pending_screening', 'removed', 'revision_requested', 'pdf_draft'])(
    'da %s non si riapre: 409',
    async (status) => {
      seed({ status });
      const res = await POST(req());
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe('invalid_status');
      expect(db.tables.biographies[0].status).toBe(status);
    }
  );

  it('una scheda congelata non si riapre', async () => {
    seed({ is_frozen: true });
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('frozen');
  });

  it('non riapre la scheda di un altro', async () => {
    seed({ user_id: 'someone-else' });
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(db.tables.biographies[0].status).toBe('published');
  });

  it('scheda inesistente: 404', async () => {
    expect((await POST(req({ biographyId: 'nope' }))).status).toBe(404);
  });

  it('senza sessione: 401', async () => {
    expect((await POST(req({ biographyId: 'b1' }, ''))).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    expect((await POST(req())).status).toBe(401);
  });

  it('senza biographyId: 400', async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it('sul confine: il giorno stesso della scadenza si può riaprire', async () => {
    seed({ next_chapter_available_at: NOW.toISOString() });
    const r = await reopenPublishedBiography(db.client, { biographyId: 'b1', userId: 'owner-1', now: NOW });
    expect(r.ok).toBe(true);
  });
});
