import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/um-id-url', () => ({ umIdBaseUrl: () => 'https://id.biographylibrary.org' }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import {
  buildArchiveEditionsMeta,
  buildBiographyMarkdown,
  buildManifestText,
  buildRecordArchiveFiles,
  editionMarkdownPath,
  sha256Hex,
} from '@/lib/archive-package';
import { syncArchivePackage, syncDueArchivePackages } from '@/lib/server/archive-package-store';
import type { PermanenceExportBiography } from '@/lib/permanence-text-export';

const VALID_UM = 'um0000k3nq7fx2mvp4';
const CANONICAL = 'UM-0000-K3NQ-7FX2-MVP4';
const FIXED_ISO = '2026-10-13T12:00:00.000Z';

function baseBio(overrides: Partial<PermanenceExportBiography> = {}): PermanenceExportBiography {
  return {
    um_id: VALID_UM,
    schema_version: 2,
    record_language_tag: 'it',
    record_script: 'Latn',
    record_direction: 'ltr',
    record_language_endonym: 'italiano',
    name_as_written: 'Maria Rossi',
    name_romanized: null,
    title: 'Maria Rossi',
    author_name: 'Maria Rossi',
    subject_name: null,
    biography_type: 'autobiography',
    published_at_iso: '2026-09-01',
    published_um_year: 0,
    rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    content_freeflow: 'Una vita.',
    biography_mode: 'freeflow',
    final_version: null,
    ...overrides,
  };
}

type EditionSpec = {
  id: string;
  record_language_tag: string;
  published_at: string;
  fail?: boolean;
  bio?: PermanenceExportBiography;
};

function makeClient(input: {
  originalId: string;
  versions: Array<Record<string, unknown>>;
  editions?: EditionSpec[];
  media?: Array<{ id: string; file_url: string; file_name: string | null; caption: string | null }>;
  editionCaptions?: Record<string, Array<{ media_id: string; caption: string }>>;
  listNonEmpty?: boolean;
  /** For syncDueArchivePackages scenarios */
  dueRows?: Array<Record<string, unknown>>;
  versionsByBio?: Record<string, Array<Record<string, unknown>>>;
  trackSyncIds?: string[];
}) {
  const uploaded: Array<{ path: string; bytes: Buffer }> = [];
  const versions = [...input.versions];
  const editions = input.editions ?? [];

  const bioRowFor = (id: string) => {
    if (id === input.originalId) {
      return {
        ...baseBio(),
        id,
        um_id: VALID_UM,
        translation_of: null,
        status: 'published',
        biography_type: 'autobiography',
        published_at: '2026-09-01T00:00:00.000Z',
        provisional_until: null,
      };
    }
    const ed = editions.find((e) => e.id === id);
    if (!ed) return null;
    if (ed.fail) return null;
    return {
      ...(ed.bio ??
        baseBio({
          um_id: null,
          record_language_tag: ed.record_language_tag,
          title: `Ed ${ed.record_language_tag}`,
          content_freeflow: `Body ${ed.record_language_tag}`,
        })),
      id,
      translation_of: input.originalId,
      status: 'published',
      published_at: ed.published_at,
    };
  };

  return {
    uploaded,
    versions,
    client: {
      from(table: string) {
        if (table === 'biographies') {
          return {
            select(_cols: string) {
              return {
                eq(col: string, value: string) {
                  if (col === 'status' && value === 'published') {
                    const rows =
                      input.dueRows ??
                      [
                        {
                          id: input.originalId,
                          biography_type: 'autobiography',
                          translation_of: null,
                          published_at: '2026-09-01T00:00:00.000Z',
                        },
                        ...editions.map((e) => ({
                          id: e.id,
                          biography_type: 'autobiography',
                          translation_of: input.originalId,
                          published_at: e.published_at,
                        })),
                      ];
                    return Promise.resolve({ data: rows, error: null });
                  }
                  if (col === 'translation_of') {
                    return {
                      eq(_c: string, _v: string) {
                        return {
                          async order() {
                            return {
                              data: editions.map((e) => ({
                                id: e.id,
                                record_language_tag: e.record_language_tag,
                                published_at: e.published_at,
                              })),
                              error: null,
                            };
                          },
                        };
                      },
                    };
                  }
                  if (col === 'id') {
                    return {
                      async maybeSingle() {
                        if (input.trackSyncIds) input.trackSyncIds.push(value);
                        const row = bioRowFor(value);
                        if (!row && editions.some((e) => e.id === value && e.fail)) {
                          return { data: null, error: { message: 'edition_read_failed' } };
                        }
                        return { data: row, error: null };
                      },
                    };
                  }
                  return {
                    async maybeSingle() {
                      return { data: null, error: null };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === 'archive_package_versions') {
          return {
            select() {
              return {
                async eq(_c: string, bioId: string) {
                  const list = input.versionsByBio
                    ? input.versionsByBio[bioId] ?? []
                    : versions;
                  return { data: list, error: null };
                },
              };
            },
            async insert(row: Record<string, unknown>) {
              versions.push(row);
              return { error: null };
            },
          };
        }
        if (table === 'biography_media') {
          return {
            select() {
              return {
                async eq() {
                  return { data: input.media ?? [], error: null };
                },
              };
            },
          };
        }
        if (table === 'biography_edition_captions') {
          return {
            select() {
              return {
                async eq(_c: string, editionId: string) {
                  return {
                    data: input.editionCaptions?.[editionId] ?? [],
                    error: null,
                  };
                },
              };
            },
          };
        }
        if (table === 'person_events' || table === 'person_relations') {
          return {
            select() {
              return {
                async eq() {
                  return { data: [], error: null };
                },
              };
            },
          };
        }
        if (table === 'biography_book_structure') {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return { data: null, error: null };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
      storage: {
        from() {
          return {
            async upload(path: string, bytes: Buffer) {
              uploaded.push({ path, bytes: Buffer.from(bytes) });
              return { error: null };
            },
            async list() {
              return {
                data: input.listNonEmpty ? [{ name: 'x' }] : [],
                error: null,
              };
            },
          };
        },
      },
    },
  };
}

describe('syncArchivePackage — edizioni', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_ISO));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }))
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('senza edizioni: elenco file e impronte identici al pacchetto di riferimento', async () => {
    const bio = baseBio();
    const biographyMd = buildBiographyMarkdown({
      bio,
      events: [],
      relations: [],
      bodyMarkdown: 'Una vita.',
      umIdBaseUrl: 'https://id.biographylibrary.org',
    });
    const recordFiles = buildRecordArchiveFiles({
      bio,
      events: [],
      relations: [],
      umIdBaseUrl: 'https://id.biographylibrary.org',
    });
    const metadata = {
      um_id: CANONICAL,
      version: 1,
      generated_at: FIXED_ISO,
      reason: 'publication',
      spec: '1.0',
      biography_type: 'autobiography',
      provisional_until: null,
      captions: [],
    };
    const files = [
      { path: 'biography.md', bytes: Buffer.from(biographyMd, 'utf8') },
      ...recordFiles,
      {
        path: 'metadata.json',
        bytes: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
      },
    ];
    const expectedManifest = buildManifestText({
      generatedAt: FIXED_ISO,
      files: files.map((f) => ({ path: f.path, sha256: sha256Hex(f.bytes) })),
    });

    const { client, uploaded } = makeClient({
      originalId: 'orig-1',
      versions: [],
      editions: [],
    });

    const result = await syncArchivePackage(client as never, 'orig-1', 'publication');
    expect(result).toEqual({ deposited: true, version: 1 });

    const byRel = Object.fromEntries(
      uploaded
        .filter((u) => u.path.startsWith(`${CANONICAL}/v1/`))
        .map((u) => [u.path.slice(`${CANONICAL}/v1/`.length), u.bytes])
    );
    expect(sha256Hex(byRel['biography.md']!)).toBe(sha256Hex(files[0]!.bytes));
    expect(sha256Hex(byRel['metadata.json']!)).toBe(sha256Hex(files[files.length - 1]!.bytes));
    expect(sha256Hex(byRel['record.txt']!)).toBe(sha256Hex(recordFiles[0]!.bytes));
    expect(sha256Hex(byRel['record.json']!)).toBe(sha256Hex(recordFiles[1]!.bytes));
    expect(sha256Hex(byRel['MANIFEST.txt']!)).toBe(sha256Hex(expectedManifest));
    expect(byRel['metadata.json']!.toString('utf8')).not.toContain('"editions"');
  });

  it('prova di rottura: chiave editions vuota cambierebbe i byte', () => {
    const without = `${JSON.stringify(
      {
        um_id: CANONICAL,
        version: 1,
        generated_at: FIXED_ISO,
        reason: 'publication',
        spec: '1.0',
        biography_type: 'autobiography',
        provisional_until: null,
        captions: [],
      },
      null,
      2
    )}\n`;
    const withEmpty = `${JSON.stringify(
      {
        um_id: CANONICAL,
        version: 1,
        generated_at: FIXED_ISO,
        reason: 'publication',
        spec: '1.0',
        biography_type: 'autobiography',
        provisional_until: null,
        captions: [],
        editions: [],
      },
      null,
      2
    )}\n`;
    expect(sha256Hex(without)).not.toBe(sha256Hex(withEmpty));
    expect(buildArchiveEditionsMeta([])).toBeUndefined();
  });

  it('due edizioni (it e pt-BR): file biography.<tag>.md e metadata.editions', async () => {
    const { client, uploaded } = makeClient({
      originalId: 'orig-1',
      versions: [
        {
          version_number: 1,
          generated_at: '2026-09-01T00:00:00.000Z',
          manifest_sha256: 'a'.repeat(64),
          reason: 'publication',
          status: 'stored',
        },
      ],
      editions: [
        { id: 'ed-it', record_language_tag: 'it', published_at: '2026-10-01T00:00:00.000Z' },
        { id: 'ed-pt', record_language_tag: 'pt-BR', published_at: '2026-10-02T00:00:00.000Z' },
      ],
      editionCaptions: {
        'ed-it': [{ media_id: 'm1', caption: 'didascalia it' }],
      },
      media: [
        {
          id: 'm1',
          file_url: 'https://example.test/a.jpg',
          file_name: 'a.jpg',
          caption: 'originale',
        },
      ],
    });

    const result = await syncArchivePackage(client as never, 'orig-1', 'edition_published');
    expect(result.deposited).toBe(true);
    expect(result.version).toBe(2);

    const paths = uploaded.map((u) => u.path);
    expect(paths.some((p) => p.endsWith(editionMarkdownPath('it')))).toBe(true);
    expect(paths.some((p) => p.endsWith(editionMarkdownPath('pt-BR')))).toBe(true);

    const metaFile = uploaded.find((u) => u.path.endsWith('metadata.json'));
    const meta = JSON.parse(metaFile!.bytes.toString('utf8')) as {
      editions: Array<{ language_tag: string; captions: Array<{ caption: string }> }>;
      captions: Array<{ caption: string }>;
    };
    expect(meta.editions.map((e) => e.language_tag)).toEqual(['it', 'pt-BR']);
    expect(meta.captions[0]!.caption).toBe('originale');
    expect(meta.editions.find((e) => e.language_tag === 'it')!.captions[0]!.caption).toBe(
      'didascalia it'
    );
    expect(meta.editions.find((e) => e.language_tag === 'pt-BR')!.captions[0]!.caption).toBe('');
  });

  it('lettura edizione fallita: nessun file scritto', async () => {
    const { client, uploaded } = makeClient({
      originalId: 'orig-1',
      versions: [
        {
          version_number: 1,
          generated_at: '2026-09-01T00:00:00.000Z',
          manifest_sha256: 'a'.repeat(64),
          reason: 'publication',
          status: 'stored',
        },
      ],
      editions: [
        {
          id: 'ed-bad',
          record_language_tag: 'fr',
          published_at: '2026-10-01T00:00:00.000Z',
          fail: true,
        },
      ],
    });

    await expect(
      syncArchivePackage(client as never, 'orig-1', 'edition_published')
    ).rejects.toThrow(/edition_bundle_unavailable|edition_read_failed/);
    expect(uploaded).toHaveLength(0);
  });

  it('prova di rottura: didascalia edizione mancante non prende quella dell\'originale', async () => {
    const { client, uploaded } = makeClient({
      originalId: 'orig-1',
      versions: [
        {
          version_number: 1,
          generated_at: '2026-09-01T00:00:00.000Z',
          manifest_sha256: 'a'.repeat(64),
          reason: 'publication',
          status: 'stored',
        },
      ],
      editions: [
        { id: 'ed-fr', record_language_tag: 'fr', published_at: '2026-10-01T00:00:00.000Z' },
      ],
      editionCaptions: {},
      media: [
        {
          id: 'm1',
          file_url: 'https://example.test/a.jpg',
          file_name: 'a.jpg',
          caption: 'didascalia originale',
        },
      ],
    });
    await syncArchivePackage(client as never, 'orig-1', 'edition_published');
    const meta = JSON.parse(
      uploaded.find((u) => u.path.endsWith('metadata.json'))!.bytes.toString('utf8')
    );
    expect(meta.editions[0].captions[0].caption).toBe('');
    expect(meta.editions[0].captions[0].caption).not.toBe('didascalia originale');
  });
});

describe('syncDueArchivePackages — edizioni mancanti', () => {
  it('edizione dopo ultima versione → passa; già inclusa no; senza versioni no', async () => {
    const trackSyncIds: string[] = [];
    const { client } = makeClient({
      originalId: 'orig-pending',
      versions: [],
      dueRows: [
        {
          id: 'orig-pending',
          biography_type: 'autobiography',
          translation_of: null,
          published_at: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'orig-included',
          biography_type: 'autobiography',
          translation_of: null,
          published_at: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'orig-no-ver',
          biography_type: 'autobiography',
          translation_of: null,
          published_at: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'ed-pending',
          biography_type: 'autobiography',
          translation_of: 'orig-pending',
          published_at: '2026-10-10T00:00:00.000Z',
        },
        {
          id: 'ed-included',
          biography_type: 'autobiography',
          translation_of: 'orig-included',
          published_at: '2026-09-15T00:00:00.000Z',
        },
      ],
      versionsByBio: {
        'orig-pending': [
          { version_number: 1, generated_at: '2026-09-02T00:00:00.000Z' },
        ],
        'orig-included': [
          { version_number: 1, generated_at: '2026-10-01T00:00:00.000Z' },
        ],
        'orig-no-ver': [],
      },
      trackSyncIds,
    });

    // Force early exit inside syncArchivePackage (no um_id) so we only observe call order.
    const origFrom = client.from.bind(client);
    const wrapped = {
      ...client,
      from(table: string) {
        if (table === 'biographies') {
          const inner = origFrom(table);
          return {
            select(cols: string) {
              if (cols.includes('um_id')) {
                return {
                  eq(_c: string, id: string) {
                    return {
                      async maybeSingle() {
                        trackSyncIds.push(id);
                        return {
                          data: {
                            id,
                            um_id: null,
                            biography_type: 'autobiography',
                            published_at: '2026-09-01T00:00:00.000Z',
                            provisional_until: null,
                            status: 'published',
                          },
                          error: null,
                        };
                      },
                    };
                  },
                };
              }
              return inner.select(cols);
            },
          };
        }
        return origFrom(table);
      },
    };

    const result = await syncDueArchivePackages(wrapped as never);
    expect(result.checked).toBe(4);
    expect(trackSyncIds).toEqual([
      'orig-pending',
      'orig-included',
      'orig-no-ver',
      'orig-pending',
    ]);
  });
});
