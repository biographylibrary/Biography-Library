import { describe, expect, it } from 'vitest';
import { applyAdminBiographyAction } from '@/lib/server/admin-biography-actions';
import type { AnyClient } from '@/lib/server/service-client';

function fakeService(row: Record<string, unknown> | null = { published_at: null, biography_type: 'autobiography' }) {
  const updates: Array<{ patch: Record<string, unknown>; id: string }> = [];
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      update: (patch: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => {
          updates.push({ patch, id });
          return { error: null };
        },
      }),
    }),
  } as unknown as AnyClient;
  return { client, updates };
}

const NOW = new Date('2026-09-30T12:00:00Z');

describe('applyAdminBiographyAction', () => {
  it('approva: pubblica e libera la presa in carico', async () => {
    const { client, updates } = fakeService();
    const r = await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'approve', actorId: 's1', now: NOW });
    expect(r).toEqual({ error: null, status: 'published' });
    expect(updates[0].patch).toEqual({
      status: 'published',
      published_at: NOW.toISOString(),
      reviewed_by: null,
      reviewed_at: null,
    });
  });

  it('rifiuta: torna a draft e libera la presa in carico', async () => {
    const { client, updates } = fakeService();
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'reject', actorId: 's1', now: NOW });
    expect(updates[0].patch).toEqual({ status: 'draft', reviewed_by: null, reviewed_at: null });
  });

  it('prende in carico con l\'id dello staff', async () => {
    const { client, updates } = fakeService();
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'claim_review', actorId: 's1', now: NOW });
    expect(updates[0].patch).toEqual({ reviewed_by: 's1', reviewed_at: NOW.toISOString() });
  });

  it('congela e scongela', async () => {
    const { client, updates } = fakeService();
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'freeze', actorId: 's1', now: NOW });
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'unfreeze', actorId: 's1', now: NOW });
    expect(updates[0].patch).toEqual({ is_frozen: true, frozen_at: NOW.toISOString(), frozen_reason: 'admin_action' });
    expect(updates[1].patch).toEqual({ is_frozen: false, frozen_at: null, frozen_reason: null });
  });

  it('pubblicazione forzata: il server scrive published_at e provisional_until la prima volta', async () => {
    const { client, updates } = fakeService({ published_at: null, biography_type: 'memorial' });
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'force_publish', actorId: 's1', now: NOW });
    expect(updates[0].patch.status).toBe('published');
    expect(updates[0].patch.published_at).toBe(NOW.toISOString());
    expect(updates[0].patch.provisional_until).toBeTruthy();
  });

  it('pubblicazione forzata su una scheda già pubblicata non cambia published_at', async () => {
    const { client, updates } = fakeService({ published_at: '2026-01-01T00:00:00Z', biography_type: 'autobiography' });
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'force_publish', actorId: 's1', now: NOW });
    expect(updates[0].patch).toEqual({ status: 'published' });
  });

  it('rimuove e ripristina', async () => {
    const { client, updates } = fakeService();
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'remove', actorId: 's1' });
    await applyAdminBiographyAction(client, { biographyId: 'b1', action: 'restore', actorId: 's1' });
    expect(updates.map((u) => u.patch.status)).toEqual(['removed', 'draft']);
  });
});
