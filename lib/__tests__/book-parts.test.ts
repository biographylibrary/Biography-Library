import { describe, expect, it } from 'vitest';
import {
  BOOK_PART_DEFS,
  bookPartTitle,
  selectBookParts,
  type BookStructureRow,
} from '@/lib/book-parts';
import { BOOK_PARTS_FOR_SCREENING } from '@/lib/server/publication-fingerprint';
import { buildBookParts } from '@/lib/server/screening-public-text';

const fullRow = (over: Partial<BookStructureRow> = {}): BookStructureRow => ({
  dedication_content: 'Per te',
  dedication_enabled: true,
  epigraph_content: 'Citazione',
  epigraph_source: 'Autore',
  epigraph_enabled: true,
  preface_content: 'Prefazione lunga',
  preface_enabled: true,
  epilogue_content: 'Fine',
  epilogue_enabled: true,
  acknowledgements_content: 'Grazie',
  acknowledgements_enabled: true,
  specific_credits_content: 'Foto di X',
  specific_credits_enabled: true,
  ...over,
});

describe('selectBookParts', () => {
  it('ordina front e back come nel PDF', () => {
    const { front, back } = selectBookParts(fullRow());
    expect(front.map((p) => p.key)).toEqual(['dedication', 'epigraph', 'preface']);
    expect(back.map((p) => p.key)).toEqual([
      'epilogue',
      'acknowledgements',
      'specific_credits',
    ]);
  });

  it('esclude interruttore spento anche con testo', () => {
    const { front } = selectBookParts(
      fullRow({ dedication_enabled: false, dedication_content: 'Ancora testo' })
    );
    expect(front.map((p) => p.key)).not.toContain('dedication');
  });

  it('esclude testo vuoto, soli spazi o a capo', () => {
    const { front } = selectBookParts(
      fullRow({
        dedication_content: '   \n\t  ',
        preface_content: '',
        epigraph_content: '<p>  </p>',
      })
    );
    expect(front.map((p) => p.key)).toEqual([]);
  });

  it('epigrafe con fonte e senza', () => {
    const withSource = selectBookParts(fullRow()).front.find((p) => p.key === 'epigraph');
    expect(withSource?.source).toBe('Autore');

    const without = selectBookParts(
      fullRow({ epigraph_source: '   ' })
    ).front.find((p) => p.key === 'epigraph');
    expect(without?.source).toBeUndefined();
  });

  it('epigrafe con sola fonte non esiste', () => {
    const { front } = selectBookParts(
      fullRow({
        epigraph_content: '',
        epigraph_source: 'Solo fonte',
        dedication_enabled: false,
        preface_enabled: false,
      })
    );
    expect(front).toEqual([]);
  });

  it('riga null: front e back vuoti', () => {
    expect(selectBookParts(null)).toEqual({ front: [], back: [] });
    expect(selectBookParts(undefined)).toEqual({ front: [], back: [] });
  });
});

describe('bookPartTitle', () => {
  it('titoli in it, en, fr, de e ripiego inglese', () => {
    expect(bookPartTitle('dedication', 'it')).toBe('Dedica');
    expect(bookPartTitle('epigraph', 'en')).toBe('Epigraph');
    expect(bookPartTitle('preface', 'fr')).toBe('Préface');
    expect(bookPartTitle('epilogue', 'de')).toBe('Nachwort');
    expect(bookPartTitle('acknowledgements', 'it')).toBe('Ringraziamenti');
    expect(bookPartTitle('specific_credits', 'en')).toBe('Credits');
    expect(bookPartTitle('dedication', 'pt-BR')).toBe('Dedication');
    expect(bookPartTitle('preface', 'es')).toBe('Preface');
  });
});

describe('allineamento con lo screening', () => {
  it('elenco chiavi e colonne coincide con BOOK_PARTS_FOR_SCREENING', () => {
    expect(
      BOOK_PART_DEFS.map((d) => [d.key, d.contentCol, d.enabledCol])
    ).toEqual(BOOK_PARTS_FOR_SCREENING.map(([k, c, e]) => [k, c, e]));
  });

  it('ogni parte di selectBookParts è anche nei blocchi di buildBookParts', () => {
    const row = fullRow({
      dedication_enabled: true,
      dedication_content: 'Dedica ok',
      epigraph_enabled: true,
      epigraph_content: 'Epigrafe ok',
      epigraph_source: 'Fonte',
      preface_enabled: true,
      preface_content: '',
      epilogue_enabled: false,
      epilogue_content: 'Nascosto',
      acknowledgements_enabled: true,
      acknowledgements_content: '   ',
      specific_credits_enabled: true,
      specific_credits_content: 'Crediti ok',
    });
    const selected = selectBookParts(row);
    const keys = [...selected.front, ...selected.back].map((p) => p.key);
    expect(keys).toEqual(['dedication', 'epigraph', 'specific_credits']);

    const blocks = buildBookParts({
      biography: {},
      sections: [],
      bookStructure: row as Record<string, unknown>,
      media: [],
      events: [],
      relations: [],
    });
    for (const key of keys) {
      expect(blocks.some((b) => b.startsWith(`[SECTION: ${key}]`))).toBe(true);
    }
  });
});
