import { describe, expect, it } from 'vitest';
import {
  assembleScreeningText,
  FINGERPRINT_NON_READABLE_FIELDS,
  FINGERPRINT_READABLE_FIELDS,
  fetchScreeningPublicText,
  orderedContentEntries,
  readableFieldsForScope,
  type FingerprintReadableField,
} from '@/lib/server/screening-public-text';
import type { PublicTextInput } from '@/lib/server/publication-fingerprint';
import { concatenateChunkBodies, splitMarkdownIntoChunks } from '@/lib/agents/screening/split-markdown-chunks';
import { MAX_CHUNK_CHARS } from '@/lib/agents/screening/chunk-limits';
import { translations } from '@/lib/i18n/translations';
import { createFakeDb } from './helpers/fake-supabase';

function sentinel(field: string): string {
  return `SENTINELLA_${field.replace(/\./g, '_')}`;
}

const UNKNOWN_CONTENT_KEY = 'capitolo_extra';
const TABLE_DIVERGENT_KEY = 'childhood';

/**
 * Scheda di prova: una sentinella per ogni campo leggibile, più i casi speciali
 * (chiave content fuori elenco, riga tabella diversa dal JSON, epigrafe solo fonte
 * in un secondo input dedicato).
 */
function inputCoveringReadableFields(): PublicTextInput {
  const contentSentinel = sentinel('biographies.content');
  const unknownSentinel = sentinel(`biographies.content.${UNKNOWN_CONTENT_KEY}`);
  const tableSentinel = sentinel('biography_sections.childhood');

  return {
    biography: {
      title: sentinel('biographies.title'),
      author_name: sentinel('biographies.author_name'),
      subject_name: sentinel('biographies.subject_name'),
      name_as_written: sentinel('biographies.name_as_written'),
      name_given: sentinel('biographies.name_given'),
      name_family: sentinel('biographies.name_family'),
      name_romanized: sentinel('biographies.name_romanized'),
      content: {
        childhood: { text: contentSentinel },
        [UNKNOWN_CONTENT_KEY]: { text: unknownSentinel },
      },
      content_freeflow: sentinel('biographies.content_freeflow'),
      final_version: sentinel('biographies.final_version'),
      biography_mode: 'sections',
    },
    sections: [
      {
        section_key: TABLE_DIVERGENT_KEY,
        content: tableSentinel,
      },
    ],
    bookStructure: {
      dedication_enabled: true,
      dedication_content: sentinel('biography_book_structure.dedication_content'),
      epigraph_enabled: true,
      epigraph_content: sentinel('biography_book_structure.epigraph_content'),
      epigraph_source: sentinel('biography_book_structure.epigraph_source'),
      preface_enabled: true,
      preface_content: sentinel('biography_book_structure.preface_content'),
      epilogue_enabled: true,
      epilogue_content: sentinel('biography_book_structure.epilogue_content'),
      acknowledgements_enabled: true,
      acknowledgements_content: sentinel('biography_book_structure.acknowledgements_content'),
      specific_credits_enabled: true,
      specific_credits_content: sentinel('biography_book_structure.specific_credits_content'),
    },
    media: [
      {
        layout: 'full-page',
        caption: sentinel('biography_media.caption'),
        display_order: 1,
      },
    ],
    editionCaptions: [{ caption: sentinel('biography_edition_captions.caption') }],
    events: [
      {
        event_type: 'birth',
        event_label: sentinel('person_events.event_label'),
        date_as_given: sentinel('person_events.date_as_given'),
        place_name_as_given: sentinel('person_events.place_name_as_given'),
        place_name_current: sentinel('person_events.place_name_current'),
        source_note: sentinel('person_events.source_note'),
      },
    ],
    relations: [
      {
        relation_code: 'parent',
        relation_label: sentinel('person_relations.relation_label'),
        related_name_as_written: sentinel('person_relations.related_name_as_written'),
        related_name_romanized: sentinel('person_relations.related_name_romanized'),
        source_note: sentinel('person_relations.source_note'),
      },
    ],
  };
}

function expectFieldSentinelInText(field: FingerprintReadableField, text: string) {
  if (field === 'biographies.content') {
    expect(text, field).toContain(sentinel(field));
    expect(text, `${field} chiave fuori elenco`).toContain(
      sentinel(`biographies.content.${UNKNOWN_CONTENT_KEY}`)
    );
    expect(text, `${field} sezione tabella diversa`).toContain(
      sentinel('biography_sections.childhood')
    );
    expect(text).toContain(`[SECTION: ${UNKNOWN_CONTENT_KEY}]`);
    expect(text).toContain(`[SECTION: ${TABLE_DIVERGENT_KEY}, tabella]`);
    return;
  }
  expect(text, field).toContain(sentinel(field));
}

describe('completezza generata da FINGERPRINT_READABLE_FIELDS', () => {
  it('publication: ogni campo leggibile porta la propria sentinella', () => {
    const { text } = assembleScreeningText(inputCoveringReadableFields(), 'publication');
    for (const field of FINGERPRINT_READABLE_FIELDS) {
      expectFieldSentinelInText(field, text);
    }
  });

  it('preprint: solo i campi dichiarati per quello scope', () => {
    const { text } = assembleScreeningText(inputCoveringReadableFields(), 'preprint');
    const covered = new Set(readableFieldsForScope('preprint'));
    for (const field of FINGERPRINT_READABLE_FIELDS) {
      const s = sentinel(field);
      if (covered.has(field)) {
        if (field === 'biographies.content') {
          expect(text, field).toContain(s);
          expect(text).toContain(sentinel(`biographies.content.${UNKNOWN_CONTENT_KEY}`));
          expect(text).toContain(sentinel('biography_sections.childhood'));
        } else {
          expect(text, field).toContain(s);
        }
      } else {
        expect(text, `escluso dal preprint: ${field}`).not.toContain(s);
      }
    }
    expect(text).not.toContain('[SECTION: title_and_names]');
    expect(text).not.toContain('[SECTION: life_events]');
    expect(text).not.toContain('[SECTION: relations]');
  });

  it('epigrafe abilitata con sola fonte: la sentinella della fonte compare', () => {
    const sourceOnly = sentinel('biography_book_structure.epigraph_source');
    const input = inputCoveringReadableFields();
    input.bookStructure = {
      epigraph_enabled: true,
      epigraph_content: '',
      epigraph_source: sourceOnly,
      dedication_enabled: false,
      preface_enabled: false,
      epilogue_enabled: false,
      acknowledgements_enabled: false,
      specific_credits_enabled: false,
    };
    input.biography = {
      ...input.biography,
      title: null,
      author_name: null,
      subject_name: null,
      name_as_written: null,
      name_given: null,
      name_family: null,
      name_romanized: null,
      content: {},
      content_freeflow: null,
      final_version: null,
    };
    input.sections = [];
    input.media = [];
    input.events = [];
    input.relations = [];

    const { text } = assembleScreeningText(input, 'publication');
    expect(text).toContain(sourceOnly);
    expect(text).toContain('[SECTION: epigraph]');
    expect(text).toContain(`epigraph_source: ${sourceOnly}`);
    expect(text).not.toContain(sentinel('biography_book_structure.epigraph_content'));
  });

  it('ogni campo non leggibile ha un motivo scritto', () => {
    for (const [field, reason] of Object.entries(FINGERPRINT_NON_READABLE_FIELDS)) {
      expect(reason.trim().length, field).toBeGreaterThan(0);
    }
  });
});

describe('orderedContentEntries e etichette', () => {
  it('mette le chiavi note nell\'ordine delle sezioni e le altre in alfabetico', () => {
    const entries = orderedContentEntries({
      legacy: { text: 'z' },
      childhood: { text: 'a' },
      another_extra: { text: 'b' },
      family: { text: '  ' },
      career: { text: 'c' },
    });
    // `legacy` è una chiave nota (dopo career nell'ordine delle sezioni);
    // `another_extra` è fuori elenco e viene dopo, in alfabetico.
    expect(entries.map((e) => e.key)).toEqual([
      'childhood',
      'career',
      'legacy',
      'another_extra',
    ]);
  });

  it('etichetta di chiave sconosciuta (anche , tabella) ripiega sulla chiave grezza', () => {
    for (const lang of ['en', 'it', 'fr', 'de'] as const) {
      const titles = translations[lang].sectionTitles;
      for (const key of ['capitolo_extra', 'childhood, tabella', 'unknown_block']) {
        const label = titles[key as keyof typeof titles] || key;
        expect(label).toBe(key);
      }
    }
  });
});

describe('assembleScreeningText: casi puntuali', () => {
  it('la parte del libro disattivata non entra', () => {
    const input = inputCoveringReadableFields();
    (input.bookStructure as Record<string, unknown>).preface_enabled = false;
    (input.bookStructure as Record<string, unknown>).preface_content =
      'SENT_DISABLED_PREFACE_SHOULD_NOT';
    const { text } = assembleScreeningText(input, 'publication');
    expect(text).not.toContain('SENT_DISABLED_PREFACE_SHOULD_NOT');
    expect(text).not.toContain('[SECTION: preface]');
  });

  it('final_version diversa da content: si esaminano entrambi e la sentinella solo in content compare', () => {
    const sentinelOnlyInContent = 'SENT_ONLY_IN_CONTENT_XYZ';
    const input = inputCoveringReadableFields();
    input.biography = {
      ...input.biography,
      title: null,
      author_name: null,
      subject_name: null,
      name_as_written: null,
      name_given: null,
      name_family: null,
      name_romanized: null,
      content: { childhood: { text: `Infanzia. ${sentinelOnlyInContent}` } },
      content_freeflow: null,
      final_version: '## Infanzia\n\nVersione finale diversa dal content.',
    };
    input.sections = [];
    input.bookStructure = null;
    input.media = [];
    input.events = [];
    input.relations = [];
    const { text } = assembleScreeningText(input, 'publication');
    expect(text).toContain(sentinelOnlyInContent);
    expect(text).toContain('[SECTION: final_version]');
    expect(text).toContain('Versione finale diversa dal content.');
  });

  it('sezione tabella uguale al JSON: non si duplica', () => {
    const same = 'Stesso testo in JSON e tabella.';
    const input = inputCoveringReadableFields();
    input.biography = {
      ...input.biography,
      title: null,
      author_name: null,
      subject_name: null,
      name_as_written: null,
      name_given: null,
      name_family: null,
      name_romanized: null,
      content: { childhood: { text: same } },
      content_freeflow: null,
      final_version: null,
    };
    input.sections = [{ section_key: 'childhood', content: same }];
    input.bookStructure = null;
    input.media = [];
    input.events = [];
    input.relations = [];
    const { text } = assembleScreeningText(input, 'publication');
    expect(text).toContain('[SECTION: childhood]');
    expect(text).not.toContain('[SECTION: childhood, tabella]');
    expect(text.match(/Stesso testo in JSON e tabella\./g)?.length).toBe(1);
  });
});

describe('fetchScreeningPublicText via fake DB', () => {
  it('legge dedica, didascalia e relazione dalla scheda', async () => {
    const db = createFakeDb({
      biographies: [
        {
          id: 'b1',
          user_id: 'u1',
          title: 'Titolo',
          author_name: 'Autore',
          content: {},
          content_freeflow: null,
          final_version: 'Corpo finale.',
          biography_mode: 'freeflow',
          content_language: 'it',
          record_language_tag: 'it',
        },
      ],
      biography_book_structure: [
        {
          biography_id: 'b1',
          dedication_enabled: true,
          dedication_content: 'A mia madre',
          epigraph_enabled: false,
        },
      ],
      biography_media: [
        { biography_id: 'b1', layout: 'full-page', caption: 'Il lago al tramonto', display_order: 0 },
      ],
      person_relations: [
        {
          biography_id: 'b1',
          relation_code: 'spouse',
          relation_label: 'Coniuge',
          related_name_as_written: 'Paolo',
        },
      ],
      person_events: [],
      biography_sections: [],
    });

    const pub = await fetchScreeningPublicText(db.client, 'b1', 'publication');
    expect(pub.text).toContain('A mia madre');
    expect(pub.text).toContain('Il lago al tramonto');
    expect(pub.text).toContain('Paolo');
    expect(pub.text).toContain('[SECTION: dedication]');
    expect(pub.text).toContain('[SECTION: photo_captions]');
    expect(pub.text).toContain('[SECTION: relations]');
    expect(pub.sourceChars).toBe(pub.text.length);
    expect(pub.authorId).toBe('u1');

    const pre = await fetchScreeningPublicText(db.client, 'b1', 'preprint');
    expect(pre.text).toContain('A mia madre');
    expect(pre.text).toContain('Il lago al tramonto');
    expect(pre.text).not.toContain('Paolo');
    expect(pre.text).not.toContain('[SECTION: relations]');
  });
});

describe('spezzatura: blocco aggiuntivo finale non si perde', () => {
  it('la concatenazione dei pezzi riproduce un testo lungo con blocco finale', () => {
    const filler = `${'parola '.repeat(Math.ceil(MAX_CHUNK_CHARS / 7))}`;
    const tail = '[SECTION: dedication]\nDedica sentinella in coda.';
    const source = `${filler}\n\n${tail}`;
    const chunks = splitMarkdownIntoChunks(source);
    expect(concatenateChunkBodies(chunks)).toBe(source);
    expect(chunks[chunks.length - 1]?.body).toContain('Dedica sentinella in coda.');
  });
});
