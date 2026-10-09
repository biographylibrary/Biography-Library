import { describe, expect, it } from 'vitest';
import {
  assembleScreeningText,
  fetchScreeningPublicText,
} from '@/lib/server/screening-public-text';
import type { PublicTextInput } from '@/lib/server/publication-fingerprint';
import { concatenateChunkBodies, splitMarkdownIntoChunks } from '@/lib/agents/screening/split-markdown-chunks';
import { MAX_CHUNK_CHARS } from '@/lib/agents/screening/chunk-limits';
import { createFakeDb } from './helpers/fake-supabase';

const SENTINELS = {
  title: 'SENT_TITLE_AAA',
  author_name: 'SENT_AUTHOR_BBB',
  subject_name: 'SENT_SUBJECT_CCC',
  name_as_written: 'SENT_ASWRITTEN_DDD',
  name_given: 'SENT_GIVEN_EEE',
  name_family: 'SENT_FAMILY_FFF',
  name_romanized: 'SENT_ROMAN_GGG',
  childhood: 'SENT_CHILDHOOD_HHH',
  freeflow: 'SENT_FREEFLOW_III',
  dedication: 'SENT_DEDICATION_JJJ',
  epigraph: 'SENT_EPIGRAPH_KKK',
  epigraph_source: 'SENT_EPISOURCE_LLL',
  preface: 'SENT_PREFACE_MMM',
  epilogue: 'SENT_EPILOGUE_NNN',
  acknowledgements: 'SENT_THANKS_OOO',
  specific_credits: 'SENT_CREDITS_PPP',
  caption: 'SENT_CAPTION_QQQ',
  event_label: 'SENT_EVENT_RRR',
  relation_label: 'SENT_RELATION_SSS',
  disabled_preface: 'SENT_DISABLED_PREFACE_SHOULD_NOT',
} as const;

function fullInput(overrides: Partial<PublicTextInput> = {}): PublicTextInput {
  return {
    biography: {
      title: SENTINELS.title,
      author_name: SENTINELS.author_name,
      subject_name: SENTINELS.subject_name,
      name_as_written: SENTINELS.name_as_written,
      name_given: SENTINELS.name_given,
      name_family: SENTINELS.name_family,
      name_romanized: SENTINELS.name_romanized,
      content: { childhood: { text: SENTINELS.childhood } },
      content_freeflow: SENTINELS.freeflow,
      final_version: null,
      biography_mode: 'sections',
    },
    sections: [],
    bookStructure: {
      dedication_enabled: true,
      dedication_content: SENTINELS.dedication,
      epigraph_enabled: true,
      epigraph_content: SENTINELS.epigraph,
      epigraph_source: SENTINELS.epigraph_source,
      preface_enabled: true,
      preface_content: SENTINELS.preface,
      epilogue_enabled: true,
      epilogue_content: SENTINELS.epilogue,
      acknowledgements_enabled: true,
      acknowledgements_content: SENTINELS.acknowledgements,
      specific_credits_enabled: true,
      specific_credits_content: SENTINELS.specific_credits,
    },
    media: [{ layout: 'full-page', caption: SENTINELS.caption, display_order: 1 }],
    events: [
      {
        event_type: 'birth',
        event_label: SENTINELS.event_label,
        date_as_given: '1950',
        place_name_as_given: 'Lugano',
        place_name_current: 'Lugano',
        source_note: 'anagrafe',
      },
    ],
    relations: [
      {
        relation_code: 'parent',
        relation_label: SENTINELS.relation_label,
        related_name_as_written: 'Marco',
        related_name_romanized: 'Marco',
        source_note: 'famiglia',
      },
    ],
    ...overrides,
  };
}

describe('assembleScreeningText: completezza del testo pubblico', () => {
  it('ogni sentinella dell\'impronta compare nel testo di pubblicazione', () => {
    const { text } = assembleScreeningText(fullInput(), 'publication');
    for (const [name, sentinel] of Object.entries(SENTINELS)) {
      if (name === 'disabled_preface') continue;
      expect(text, name).toContain(sentinel);
    }
    expect(text).toContain('[SECTION: title_and_names]');
    expect(text).toContain('[SECTION: dedication]');
    expect(text).toContain('[SECTION: epigraph]');
    expect(text).toContain('[SECTION: photo_captions]');
    expect(text).toContain('[SECTION: life_events]');
    expect(text).toContain('[SECTION: relations]');
  });

  it('la parte del libro disattivata non entra', () => {
    const input = fullInput();
    (input.bookStructure as Record<string, unknown>).preface_enabled = false;
    (input.bookStructure as Record<string, unknown>).preface_content = SENTINELS.disabled_preface;
    const { text } = assembleScreeningText(input, 'publication');
    expect(text).not.toContain(SENTINELS.disabled_preface);
    expect(text).not.toContain('[SECTION: preface]');
  });

  it('preprint: corpo, parti libro e didascalie; niente titoli, eventi, relazioni', () => {
    const { text } = assembleScreeningText(fullInput(), 'preprint');
    expect(text).toContain(SENTINELS.dedication);
    expect(text).toContain(SENTINELS.caption);
    expect(text).toContain(SENTINELS.childhood);
    expect(text).not.toContain(SENTINELS.title);
    expect(text).not.toContain('[SECTION: title_and_names]');
    expect(text).not.toContain(SENTINELS.event_label);
    expect(text).not.toContain('[SECTION: life_events]');
    expect(text).not.toContain(SENTINELS.relation_label);
    expect(text).not.toContain('[SECTION: relations]');
  });

  it('final_version diversa da content: si esaminano entrambi e la sentinella solo in content compare', () => {
    const sentinelOnlyInContent = 'SENT_ONLY_IN_CONTENT_XYZ';
    const base = fullInput();
    const input = fullInput({
      biography: {
        ...base.biography,
        content: { childhood: { text: `Infanzia. ${sentinelOnlyInContent}` } },
        content_freeflow: null,
        final_version: '## Infanzia\n\nVersione finale diversa dal content.',
      },
    });
    const { text } = assembleScreeningText(input, 'publication');
    expect(text).toContain(sentinelOnlyInContent);
    expect(text).toContain('[SECTION: final_version]');
    expect(text).toContain('Versione finale diversa dal content.');
  });

  it('final_version uguale al corpo composto (normalizzato): un solo testo, senza blocco final_version', () => {
    const body = 'Sono nata a Lugano.';
    const input = fullInput({
      biography: {
        title: null,
        author_name: null,
        subject_name: null,
        name_as_written: null,
        name_given: null,
        name_family: null,
        name_romanized: null,
        content: { childhood: { text: body } },
        content_freeflow: null,
        final_version: body,
        biography_mode: 'sections',
      },
      sections: [],
      bookStructure: null,
      media: [],
      events: [],
      relations: [],
    });
    const { text } = assembleScreeningText(input, 'publication');
    expect(text).toContain(body);
    expect(text).not.toContain('[SECTION: final_version]');
    expect(text.match(new RegExp(body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))?.length).toBe(1);
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
