import { describe, expect, it, vi } from 'vitest';
import { resolveEditionIdentity } from '@/lib/edition-identity';

function clientWithRows(
  byId: Record<string, { um_id?: string | null; translation_of?: string | null } | null>,
  opts?: { errorIds?: Set<string> }
) {
  const errorIds = opts?.errorIds ?? new Set<string>();
  return {
    from: () => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: vi.fn(async () => {
            if (errorIds.has(id)) {
              return { data: null, error: { message: 'db_error' } };
            }
            return {
              data: Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null,
              error: null,
            };
          }),
        }),
      }),
    }),
  };
}

describe('resolveEditionIdentity', () => {
  it('per un originale restituisce il proprio um_id senza failed', async () => {
    const client = clientWithRows({
      'orig-1': { um_id: 'UM-ORIG', translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'orig-1')).toEqual({
      umId: 'UM-ORIG',
      failed: false,
      isEdition: false,
    });
  });

  it('per un\'edizione restituisce l\'um_id dell\'originale', async () => {
    const client = clientWithRows({
      'ed-1': { um_id: null, translation_of: 'orig-1' },
      'orig-1': { um_id: 'UM-ORIG', translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'ed-1')).toEqual({
      umId: 'UM-ORIG',
      failed: false,
      isEdition: true,
    });
  });

  it('um_id dell\'edizione resta ignorato anche se valorizzato per errore', async () => {
    const client = clientWithRows({
      'ed-1': { um_id: 'UM-EDITION-WRONG', translation_of: 'orig-1' },
      'orig-1': { um_id: 'UM-ORIG', translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'ed-1')).toEqual({
      umId: 'UM-ORIG',
      failed: false,
      isEdition: true,
    });
  });

  it('se l\'originale non ha identificativo: umId null, failed false', async () => {
    const client = clientWithRows({
      'ed-1': { um_id: null, translation_of: 'orig-1' },
      'orig-1': { um_id: null, translation_of: null },
    });
    expect(await resolveEditionIdentity(client, 'ed-1')).toEqual({
      umId: null,
      failed: false,
      isEdition: true,
    });
  });

  it('se la lettura dell\'originale fallisce: failed true', async () => {
    const client = clientWithRows(
      {
        'ed-1': { um_id: null, translation_of: 'orig-1' },
        'orig-1': { um_id: 'UM-ORIG', translation_of: null },
      },
      { errorIds: new Set(['orig-1']) }
    );
    expect(await resolveEditionIdentity(client, 'ed-1')).toEqual({
      umId: null,
      failed: true,
      isEdition: true,
    });
  });
});
