import { describe, expect, it, vi } from 'vitest';
import { resolveEditionIdentity } from '@/lib/edition-identity';

function clientWithRows(byId: Record<string, { um_id?: string | null; translation_of?: string | null } | null>) {
  return {
    from: () => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: vi.fn(async () => ({
            data: Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null,
            error: null,
          })),
        }),
      }),
    }),
  };
}

describe('resolveEditionIdentity', () => {
  it('per un originale restituisce il proprio um_id', async () => {
    const client = clientWithRows({
      'orig-1': { um_id: 'UM-ORIG', translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'orig-1')).toBe('UM-ORIG');
  });

  it('per un\'edizione restituisce l\'um_id dell\'originale', async () => {
    const client = clientWithRows({
      'ed-1': { um_id: null, translation_of: 'orig-1' },
      'orig-1': { um_id: 'UM-ORIG', translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'ed-1')).toBe('UM-ORIG');
  });

  it('um_id dell\'edizione resta ignorato anche se valorizzato per errore', async () => {
    const client = clientWithRows({
      'ed-1': { um_id: 'UM-EDITION-WRONG', translation_of: 'orig-1' },
      'orig-1': { um_id: 'UM-ORIG', translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'ed-1')).toBe('UM-ORIG');
  });

  it('se l\'originale non ha identificativo restituisce null (come oggi per assente)', async () => {
    const client = clientWithRows({
      'ed-1': { um_id: null, translation_of: 'orig-1' },
      'orig-1': { um_id: null, translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'ed-1')).toBeNull();
  });
});
