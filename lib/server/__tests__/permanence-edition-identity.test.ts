import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import {
  EditionIdentityUnavailableError,
  loadPermanenceExportBundle,
} from '@/lib/server/permanence-stored-exports';
import { EditionLifeFactsUnavailableError } from '@/lib/edition-life-facts';

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

type LifeFactsOpts = {
  errorIds?: Set<string>;
  eventsByBio?: Record<string, unknown[]>;
  relationsByBio?: Record<string, unknown[]>;
  lifeFactsErrorIds?: Set<string>;
  queriedEventBioIds?: string[];
  queriedRelationBioIds?: string[];
};

/** Client che risolve anche le query senza maybeSingle (events/relations). */
function makeBundleClient(byId: Record<string, BioRow | null>, opts?: LifeFactsOpts) {
  const errorIds = opts?.errorIds ?? new Set<string>();
  const eventsByBio = opts?.eventsByBio ?? {};
  const relationsByBio = opts?.relationsByBio ?? {};
  const lifeFactsErrorIds = opts?.lifeFactsErrorIds ?? new Set<string>();
  const queriedEventBioIds = opts?.queriedEventBioIds;
  const queriedRelationBioIds = opts?.queriedRelationBioIds;
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
      if (table === 'person_events' || table === 'person_relations') {
        return {
          select: () => ({
            eq: async (_col: string, id: string) => {
              if (table === 'person_events') queriedEventBioIds?.push(id);
              if (table === 'person_relations') queriedRelationBioIds?.push(id);
              if (lifeFactsErrorIds.has(id)) {
                return { data: null, error: { message: 'life_facts_error' } };
              }
              const rows =
                table === 'person_events' ? eventsByBio[id] ?? [] : relationsByBio[id] ?? [];
              return { data: rows, error: null };
            },
          }),
        };
      }
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

describe('loadPermanenceExportBundle — life facts', () => {
  it('edizione: person_events e person_relations usano l\'id dell\'originale', async () => {
    const queriedEventBioIds: string[] = [];
    const queriedRelationBioIds: string[] = [];
    const client = makeBundleClient(
      {
        'ed-1': {
          um_id: null,
          translation_of: 'orig-1',
          schema_version: 2,
          record_language_tag: 'en',
          title: 'EN',
          author_name: 'A',
          status: 'published',
        },
        'orig-1': {
          um_id: VALID_UM,
          translation_of: null,
          schema_version: 2,
          record_language_tag: 'it',
          title: 'IT',
          author_name: 'A',
          status: 'published',
        },
      },
      {
        queriedEventBioIds,
        queriedRelationBioIds,
        eventsByBio: {
          'orig-1': [
            {
              event_type: 'birth',
              event_label: 'nascita',
              date_edtf: '1948-03-14',
              date_as_given: '14 marzo 1948',
              calendar_label: null,
              date_start_iso: '1948-03-14',
              date_start_jdn: null,
              place_name_as_given: 'Roma',
              place_lat: null,
              place_lon: null,
              asserted_by: 'self',
              asserted_by_label: 'la persona stessa',
              confidence: 'certain',
            },
          ],
        },
        relationsByBio: {
          'orig-1': [
            {
              relation_code: 'parent',
              relation_label: 'genitore',
              related_name_as_written: 'Anna',
            },
          ],
        },
      }
    );
    const bundle = await loadPermanenceExportBundle(client as never, 'ed-1');
    expect(queriedEventBioIds).toEqual(['orig-1']);
    expect(queriedRelationBioIds).toEqual(['orig-1']);
    expect(bundle!.events[0]!.event_label).toBe('birth');
    expect(bundle!.relations[0]!.relation_label).toBe('parent');
  });

  it('originale: le query restano sul proprio id', async () => {
    const queriedEventBioIds: string[] = [];
    const queriedRelationBioIds: string[] = [];
    const client = makeBundleClient(
      {
        'orig-1': {
          um_id: VALID_UM,
          translation_of: null,
          schema_version: 2,
          record_language_tag: 'it',
          title: 'IT',
          author_name: 'A',
          status: 'published',
        },
      },
      { queriedEventBioIds, queriedRelationBioIds }
    );
    await loadPermanenceExportBundle(client as never, 'orig-1');
    expect(queriedEventBioIds).toEqual(['orig-1']);
    expect(queriedRelationBioIds).toEqual(['orig-1']);
  });

  it('lettura fatti fallita → EditionLifeFactsUnavailableError, nessuna scheda', async () => {
    const client = makeBundleClient(
      {
        'ed-1': {
          um_id: null,
          translation_of: 'orig-1',
          schema_version: 2,
          record_language_tag: 'en',
          title: 'EN',
          author_name: 'A',
          status: 'published',
        },
        'orig-1': {
          um_id: VALID_UM,
          translation_of: null,
          schema_version: 2,
          record_language_tag: 'it',
          title: 'IT',
          author_name: 'A',
          status: 'published',
        },
      },
      { lifeFactsErrorIds: new Set(['orig-1']) }
    );
    await expect(loadPermanenceExportBundle(client as never, 'ed-1')).rejects.toBeInstanceOf(
      EditionLifeFactsUnavailableError
    );
  });

  it('prova di rottura: se si leggesse con l\'id dell\'edizione, i fatti sarebbero vuoti', async () => {
    const queriedEventBioIds: string[] = [];
    const client = makeBundleClient(
      {
        'ed-1': {
          um_id: null,
          translation_of: 'orig-1',
          schema_version: 2,
          record_language_tag: 'en',
          title: 'EN',
          author_name: 'A',
          status: 'published',
        },
        'orig-1': {
          um_id: VALID_UM,
          translation_of: null,
          schema_version: 2,
          record_language_tag: 'it',
          title: 'IT',
          author_name: 'A',
          status: 'published',
        },
      },
      {
        queriedEventBioIds,
        eventsByBio: {
          'orig-1': [
            {
              event_type: 'birth',
              event_label: 'nascita',
              date_edtf: '1948-03-14',
              date_as_given: null,
              calendar_label: null,
              date_start_iso: null,
              date_start_jdn: null,
              place_name_as_given: null,
              place_lat: null,
              place_lon: null,
              asserted_by: 'self',
              asserted_by_label: 'la persona stessa',
              confidence: 'certain',
            },
          ],
          'ed-1': [],
        },
      }
    );
    const bundle = await loadPermanenceExportBundle(client as never, 'ed-1');
    expect(queriedEventBioIds).not.toContain('ed-1');
    expect(bundle!.events).toHaveLength(1);
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

describe('fetchPermanencePdfData — life facts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('edizione: fatti dall\'originale; fallimento → errore', async () => {
    const queried: string[] = [];
    const rows: Record<string, BioRow> = {
      'ed-1': {
        um_id: null,
        translation_of: 'orig-1',
        schema_version: 2,
        record_language_tag: 'en',
        title: 'EN',
        author_name: 'A',
      },
      'orig-1': {
        um_id: VALID_UM,
        translation_of: null,
        schema_version: 2,
        record_language_tag: 'it',
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
            eq: async (_c: string, id: string) => {
              queried.push(`${table}:${id}`);
              if (table === 'person_events' && id === 'orig-1') {
                return {
                  data: [
                    {
                      event_type: 'birth',
                      event_label: 'nascita',
                      date_edtf: '1948-03-14',
                      date_as_given: null,
                      calendar_label: null,
                      date_start_iso: null,
                      date_start_jdn: null,
                      place_name_as_given: null,
                      place_lat: null,
                      place_lon: null,
                      asserted_by: 'self',
                      asserted_by_label: 'la persona stessa',
                      confidence: 'certain',
                    },
                  ],
                  error: null,
                };
              }
              return { data: [], error: null };
            },
          }),
        };
      },
    };

    const { setPdfExportSupabaseClient, fetchPermanencePdfData } = await import(
      '@/lib/pdf-export'
    );
    setPdfExportSupabaseClient(fake as never);
    const result = await fetchPermanencePdfData('ed-1');
    expect(queried).toContain('person_events:orig-1');
    expect(queried).not.toContain('person_events:ed-1');
    expect(result.events[0]!.event_label).toBe('birth');
    setPdfExportSupabaseClient(null);
  });

  it('edizione: lettura fatti fallita lancia EditionLifeFactsUnavailableError', async () => {
    const rows: Record<string, BioRow> = {
      'ed-1': {
        um_id: null,
        translation_of: 'orig-1',
        schema_version: 2,
        record_language_tag: 'en',
        title: 'EN',
        author_name: 'A',
      },
      'orig-1': {
        um_id: VALID_UM,
        translation_of: null,
        schema_version: 2,
        record_language_tag: 'it',
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
            eq: async () => ({ data: null, error: { message: 'boom' } }),
          }),
        };
      },
    };

    const { setPdfExportSupabaseClient, fetchPermanencePdfData } = await import(
      '@/lib/pdf-export'
    );
    const { EditionLifeFactsUnavailableError: Err } = await import('@/lib/edition-life-facts');
    setPdfExportSupabaseClient(fake as never);
    await expect(fetchPermanencePdfData('ed-1')).rejects.toBeInstanceOf(Err);
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
