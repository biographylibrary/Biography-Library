import { describe, expect, it } from 'vitest';
import { resolveRecordLanguageTag, recordLanguageUiBase } from '@/lib/record-language';
import { nfcBiographyWriteFields } from '@/lib/nfc-biography';

describe('resolveRecordLanguageTag', () => {
  it('prefers record_language_tag', () => {
    expect(
      resolveRecordLanguageTag({
        record_language_tag: 'it-CH',
        content_language: 'en',
      })
    ).toBe('it-CH');
  });

  it('falls back to content_language', () => {
    expect(resolveRecordLanguageTag({ content_language: 'fr' })).toBe('fr');
  });
});

describe('recordLanguageUiBase', () => {
  it('extracts UI base', () => {
    expect(recordLanguageUiBase('de-AT')).toBe('de');
  });
});

describe('nfcBiographyWriteFields', () => {
  it('normalizes title and section text', () => {
    const composed = 'e\u0301'; // e + combining acute
    const out = nfcBiographyWriteFields({
      title: composed,
      content: { childhood: { text: composed } },
    });
    expect(out.title).toBe('é');
    expect((out.content as any).childhood.text).toBe('é');
  });

  it('converts stored HTML sections to archive Markdown on write', () => {
    const out = nfcBiographyWriteFields({
      content: { childhood: { text: '<p>Hello <strong>world</strong></p>' } },
      content_freeflow: '<p>Una vita.</p>',
      final_version: '<p>Finale</p>',
    });
    expect((out.content as any).childhood.text).toBe('Hello **world**');
    expect(out.content_freeflow).toBe('Una vita.');
    expect(out.final_version).toBe('Finale');
  });
});
