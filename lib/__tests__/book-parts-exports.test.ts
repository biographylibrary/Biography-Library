import { describe, expect, it } from 'vitest';
import { escapeMarkdownBlockLine } from '@/lib/archive-markdown';
import { buildBiographyMarkdown } from '@/lib/archive-package';
import {
  formatBookPartsArchiveMarkdown,
  selectBookParts,
  type BookPart,
  type BookStructureRow,
} from '@/lib/book-parts';
import { buildPermanencePlainText } from '@/lib/permanence-text-export';
import { loadPermanenceExportBundle } from '@/lib/server/permanence-stored-exports';

const BIO = {
  um_id: 'um0000k3nq7fx2mvp4',
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
  biography_type: 'autobiography' as const,
  published_at_iso: '2026-09-03',
  published_um_year: 0,
  rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  content_freeflow: '<p>Corpo del racconto.</p>',
  biography_mode: 'freeflow' as const,
};

const structure: BookStructureRow = {
  dedication_content: 'Per te',
  dedication_enabled: true,
  epigraph_content: 'Citazione',
  epigraph_source: 'Autore',
  epigraph_enabled: true,
  preface_content: 'Prefazione',
  preface_enabled: true,
  epilogue_content: 'Epilogo',
  epilogue_enabled: true,
  acknowledgements_content: 'Grazie',
  acknowledgements_enabled: true,
  specific_credits_content: 'Crediti',
  specific_credits_enabled: true,
};

describe('archivio e testi con parti del libro', () => {
  it('ordine front, corpo, back e titoli in Markdown', () => {
    const parts = selectBookParts(structure);
    const md = buildBiographyMarkdown({
      bio: BIO,
      events: [],
      relations: [],
      bodyMarkdown: 'Corpo del racconto.',
      bookParts: parts,
    });
    const dedica = md.indexOf('## Dedica');
    const prefazione = md.indexOf('## Prefazione');
    const corpo = md.indexOf('Corpo del racconto.');
    const epilogo = md.indexOf('## Epilogo');
    const crediti = md.indexOf('## Crediti');
    expect(dedica).toBeGreaterThan(-1);
    expect(prefazione).toBeGreaterThan(dedica);
    expect(corpo).toBeGreaterThan(prefazione);
    expect(epilogo).toBeGreaterThan(corpo);
    expect(crediti).toBeGreaterThan(epilogo);
    expect(md).toContain('— Autore');
  });

  it('protegge asterischi, parentesi quadre e a capo nella fonte dell\'epigrafe', () => {
    const parts: BookPart[] = [
      {
        key: 'epigraph',
        text: 'Citazione',
        source: '*fonte* [nota]\nseconda riga',
      },
    ];
    const md = formatBookPartsArchiveMarkdown(parts, 'it');
    const first = escapeMarkdownBlockLine('*fonte* [nota]');
    const second = escapeMarkdownBlockLine('seconda riga');
    expect(md).toContain(`— ${first}`);
    expect(md).toContain(second);
    expect(md).toContain('\\*fonte\\*');
    expect(md).toContain('\\[nota\\]');
    expect(md).toMatch(/— .+\\*fonte\\*.+\nseconda riga/);
  });

  it('senza parti l\'output Markdown è identico a oggi', () => {
    const base = {
      bio: BIO,
      events: [] as [],
      relations: [] as [],
      bodyMarkdown: 'Corpo del racconto.',
    };
    const without = buildBiographyMarkdown(base);
    const withAbsent = buildBiographyMarkdown({ ...base, bookParts: undefined });
    const withEmpty = buildBiographyMarkdown({
      ...base,
      bookParts: { front: [], back: [] },
    });
    expect(withAbsent).toBe(without);
    expect(withEmpty).toBe(without);
  });

  it('testo permanence: ordine e identità senza parti', () => {
    const parts = selectBookParts(structure);
    const withParts = buildPermanencePlainText(
      BIO,
      [],
      [],
      undefined,
      null,
      parts
    );
    const dedica = withParts.indexOf('Dedica');
    const corpo = withParts.indexOf('Corpo del racconto.');
    const epilogo = withParts.indexOf('Epilogo');
    expect(dedica).toBeGreaterThan(withParts.indexOf('---'));
    expect(corpo).toBeGreaterThan(dedica);
    expect(epilogo).toBeGreaterThan(corpo);

    const plain = buildPermanencePlainText(BIO, [], []);
    expect(buildPermanencePlainText(BIO, [], [], undefined, null, undefined)).toBe(plain);
    expect(
      buildPermanencePlainText(BIO, [], [], undefined, null, { front: [], back: [] })
    ).toBe(plain);
  });

  it('loadPermanenceExportBundle con e senza riga', async () => {
    const tables: Record<string, unknown> = {
      biographies: { ...BIO, status: 'published' },
      person_events: [],
      person_relations: [],
      biography_book_structure: structure,
    };

    const svc = {
      from: (table: string) => {
        if (table === 'biographies' || table === 'biography_book_structure') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: tables[table] ?? null,
                  error: null,
                }),
              }),
            }),
          };
        }
        const result = { data: tables[table] ?? [], error: null };
        return {
          select: () => ({
            eq: () => Promise.resolve(result),
          }),
        };
      },
    };

    const withRow = await loadPermanenceExportBundle(svc as never, 'bio-1');
    expect(withRow?.bookParts.front.map((p) => p.key)).toEqual([
      'dedication',
      'epigraph',
      'preface',
    ]);

    tables.biography_book_structure = null;
    const without = await loadPermanenceExportBundle(svc as never, 'bio-1');
    expect(without?.bookParts).toEqual({ front: [], back: [] });
  });
});
