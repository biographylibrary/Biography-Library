import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import {
  EditionIdentityUnavailableError,
  loadPermanenceExportBundle,
} from '@/lib/server/permanence-stored-exports';

const VALID_UM = 'um0000k3nq7fx2mvp4';

type BioRow = {
  um_id: string | null;
  translation_of?: string | null;
  schema_version?: number;
  record_language_tag?: string;
  record_script?: string;
  record_direction?: string;
  title?: string;
  author_name?: string;
  status?: string;
};

/** Client che risolve anche le query senza maybeSingle (events/relations). */
function makeBundleClient(
  byId: Record<string, BioRow | null>,
  opts?: { errorIds?: Set<string> }
) {
  const errorIds = opts?.errorIds ?? new Set<string>();
  return {
    from: (table: string) => {
      if (table === 'biographies') {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => {
                if (errorIds.has(id)) {
                  return { data: null, error: { message: 'db_error' } };
                }
                return {
                  data: Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null,
                  error: null,
                };
              },
            }),
          }),
        };
      }
      const emptyList = {
        select: () => ({
          eq: async () => ({ data: [], error: null }),
        }),
      };
      if (table === 'person_events' || table === 'person_relations') return emptyList;
      if (table === 'biography_book_structure') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe('loadPermanenceExportBundle — identity', () => {
  it('edizione: bundle.um_id è quello dell\'originale', async () => {
    const client = makeBundleClient({
      'ed-1': {
        um_id: null,
        translation_of: 'orig-1',
        schema_version: 2,
        title: 'FR',
        author_name: 'A',
        status: 'draft',
      },
      'orig-1': {
        um_id: VALID_UM,
        translation_of: null,
        schema_version: 2,
        title: 'IT',
        author_name: 'A',
        status: 'published',
      },
    });
    const bundle = await loadPermanenceExportBundle(client as never, 'ed-1');
    expect(bundle).not.toBeNull();
    expect(bundle!.bio.um_id).toBe(VALID_UM);
  });

  it('originale: bundle.um_id è quello della riga (senza seconda lettura obbligatoria)', async () => {
    const client = makeBundleClient({
      'orig-1': {
        um_id: VALID_UM,
        translation_of: null,
        schema_version: 2,
        title: 'IT',
        author_name: 'A',
        status: 'published',
      },
    });
    const bundle = await loadPermanenceExportBundle(client as never, 'orig-1');
    expect(bundle).not.toBeNull();
    expect(bundle!.bio.um_id).toBe(VALID_UM);
  });

  it('prova di rottura: se si usasse solo um_id della riga edizione, il test fallirebbe', async () => {
    const client = makeBundleClient({
      'ed-1': {
        um_id: null,
        translation_of: 'orig-1',
        schema_version: 2,
        title: 'FR',
        author_name: 'A',
        status: 'draft',
      },
      'orig-1': {
        um_id: VALID_UM,
        translation_of: null,
        schema_version: 2,
        title: 'IT',
        author_name: 'A',
        status: 'published',
      },
    });
    const bundle = await loadPermanenceExportBundle(client as never, 'ed-1');
    // Se qualcuno tornasse a `um_id: row.um_id` senza resolve, qui sarebbe null.
    expect(bundle!.bio.um_id).not.toBeNull();
    expect(bundle!.bio.um_id).toBe(VALID_UM);
  });

  it('edizione: lettura originale fallita → EditionIdentityUnavailableError', async () => {
    const client = makeBundleClient(
      {
        'ed-1': {
          um_id: null,
          translation_of: 'orig-1',
          schema_version: 2,
          title: 'FR',
          author_name: 'A',
          status: 'draft',
        },
        'orig-1': {
          um_id: VALID_UM,
          translation_of: null,
          schema_version: 2,
          title: 'IT',
          author_name: 'A',
          status: 'published',
        },
      },
      { errorIds: new Set(['orig-1']) }
    );
    await expect(loadPermanenceExportBundle(client as never, 'ed-1')).rejects.toBeInstanceOf(
      EditionIdentityUnavailableError
    );
  });
});

describe('fetchPermanencePdfData — identity', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('edizione: um_id dall\'originale; originale: dalla riga', async () => {
    const rows: Record<string, BioRow> = {
      'ed-1': {
        um_id: null,
        translation_of: 'orig-1',
        schema_version: 2,
        title: 'FR',
        author_name: 'A',
      },
      'orig-1': {
        um_id: VALID_UM,
        translation_of: null,
        schema_version: 2,
        title: 'IT',
        author_name: 'A',
      },
    };

    const fake = {
      from: (table: string) => {
        if (table === 'biographies') {
          return {
            select: () => ({
              eq: (_c: string, id: string) => ({
                maybeSingle: async () => ({
                  data: rows[id] ?? null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      },
    };

    const { setPdfExportSupabaseClient, fetchPermanencePdfData } = await import(
      '@/lib/pdf-export'
    );
    setPdfExportSupabaseClient(fake as never);

    const edition = await fetchPermanencePdfData('ed-1');
    expect(edition.bio?.um_id).toBe(VALID_UM);

    const original = await fetchPermanencePdfData('orig-1');
    expect(original.bio?.um_id).toBe(VALID_UM);

    setPdfExportSupabaseClient(null);
  });

  it('edizione con lettura originale fallita: lancia', async () => {
    const fake = {
      from: (table: string) => {
        if (table === 'biographies') {
          return {
            select: () => ({
              eq: (_c: string, id: string) => ({
                maybeSingle: async () => {
                  if (id === 'ed-1') {
                    return {
                      data: {
                        um_id: null,
                        translation_of: 'orig-1',
                        schema_version: 2,
                        title: 'FR',
                        author_name: 'A',
                      },
                      error: null,
                    };
                  }
                  return { data: null, error: { message: 'boom' } };
                },
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      },
    };

    const { setPdfExportSupabaseClient, fetchPermanencePdfData } = await import(
      '@/lib/pdf-export'
    );
    setPdfExportSupabaseClient(fake as never);
    await expect(fetchPermanencePdfData('ed-1')).rejects.toThrow(
      'edition_identity_unavailable'
    );
    setPdfExportSupabaseClient(null);
  });

  it('originale: lettura successiva fallita non tocca um_id della riga', async () => {
    let bioReads = 0;
    const fake = {
      from: (table: string) => {
        if (table === 'biographies') {
          return {
            select: () => ({
              eq: (_c: string, id: string) => ({
                maybeSingle: async () => {
                  bioReads += 1;
                  if (bioReads === 1 && id === 'orig-1') {
                    return {
                      data: {
                        um_id: VALID_UM,
                        translation_of: null,
                        schema_version: 2,
                        title: 'IT',
                        author_name: 'A',
                      },
                      error: null,
                    };
                  }
                  return { data: null, error: { message: 'boom' } };
                },
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      },
    };

    const { setPdfExportSupabaseClient, fetchPermanencePdfData } = await import(
      '@/lib/pdf-export'
    );
    setPdfExportSupabaseClient(fake as never);
    const result = await fetchPermanencePdfData('orig-1');
    expect(result.bio?.um_id).toBe(VALID_UM);
    expect(bioReads).toBe(1);
    setPdfExportSupabaseClient(null);
  });
});

describe('EditionIdentityUnavailableError', () => {
  it('è un Error con nome dedicato', () => {
    const err = new EditionIdentityUnavailableError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('EditionIdentityUnavailableError');
  });
});
