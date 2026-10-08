import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

let db: FakeDb;
const auth = vi.fn();
const screenRevisionAndAttach = vi.fn(async () => ({ ok: true }));
const checkPerUserThrottle = vi.fn(async () => true);

vi.mock('@/lib/server/onboarding-api-auth', () => ({ getAuthenticatedUser: () => auth() }));
vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => db.client,
  checkPerUserThrottle: (...a: unknown[]) =>
    (checkPerUserThrottle as (...x: unknown[]) => Promise<boolean>)(...a),
}));
vi.mock('@/lib/server/revision-screening', () => ({
  screenRevisionAndAttach: (...a: unknown[]) =>
    (screenRevisionAndAttach as (...x: unknown[]) => Promise<unknown>)(...a),
}));

import { POST } from '@/app/api/moderation/resubmit/route';

const req = (body: unknown = { biographyId: 'b1' }) =>
  new NextRequest('http://localhost/api/moderation/resubmit', {
    method: 'POST',
    body: JSON.stringify(body),
  });

function seed(status = 'revision_requested', owner = 'owner-1') {
  db = createFakeDb({
    biographies: [{ id: 'b1', user_id: owner, status }],
    moderation_reports: [{ id: 'r1', biography_id: 'b1', status: 'decided' }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: 'owner-1' } });
  checkPerUserThrottle.mockResolvedValue(true);
  seed();
});

describe('POST /api/moderation/resubmit', () => {
  it('sposta la scheda in revision_pending_review e fa partire lo screening sul testo corretto', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(db.tables.biographies[0].status).toBe('revision_pending_review');
    expect(checkPerUserThrottle).toHaveBeenCalledWith(
      expect.anything(),
      'owner-1',
      'moderation_resubmit'
    );
    expect(screenRevisionAndAttach).toHaveBeenCalledTimes(1);
    expect(screenRevisionAndAttach).toHaveBeenCalledWith(expect.anything(), {
      biographyId: 'b1',
      reportId: 'r1',
      authorId: 'owner-1',
    });
    expect(
      db.log.some(
        (l) =>
          l.op === 'update' && l.table === 'biographies' && l.data.status === 'published'
      )
    ).toBe(false);
  });

  it('risponde 429 se il limite moderation_resubmit è esaurito', async () => {
    checkPerUserThrottle.mockResolvedValueOnce(false);
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(screenRevisionAndAttach).not.toHaveBeenCalled();
    expect(db.tables.biographies[0].status).toBe('revision_requested');
  });

  it('se lo screening non riesce, l\'invio dell\'autore riesce comunque', async () => {
    screenRevisionAndAttach.mockResolvedValueOnce({ ok: false });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(db.tables.biographies[0].status).toBe('revision_pending_review');
  });

  it.each(['draft', 'published', 'under_review', 'revision_overdue', 'revision_pending_review'])(
    'da %s non si invia: 400 e nessuno screening',
    async (status) => {
      seed(status);
      const res = await POST(req());
      expect(res.status).toBe(400);
      expect(screenRevisionAndAttach).not.toHaveBeenCalled();
      expect(db.tables.biographies[0].status).toBe(status);
    }
  );

  it('non invia la scheda di un altro', async () => {
    seed('revision_requested', 'someone-else');
    expect((await POST(req())).status).toBe(400);
    expect(screenRevisionAndAttach).not.toHaveBeenCalled();
  });

  it('senza sessione: 401', async () => {
    auth.mockResolvedValue({ error: 'Authentication required', status: 401 });
    expect((await POST(req())).status).toBe(401);
  });
});
