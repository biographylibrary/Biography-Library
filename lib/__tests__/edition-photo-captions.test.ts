import { describe, expect, it } from 'vitest';
import { editionCaptionProgress } from '@/lib/edition-photo-captions';

describe('editionCaptionProgress', () => {
  it('nessuna foto', () => {
    expect(editionCaptionProgress([], [])).toEqual({
      total: 0,
      translated: 0,
      missingMediaIds: [],
    });
  });

  it('foto senza didascalia nell\'originale non contano', () => {
    const progress = editionCaptionProgress(
      [
        { id: 'a', caption: '' },
        { id: 'b', caption: '   ' },
        { id: 'c', caption: null },
      ],
      [{ media_id: 'a', caption: 'tradotta' }]
    );
    expect(progress).toEqual({ total: 0, translated: 0, missingMediaIds: [] });
  });

  it('didascalia vuota o di soli spazi nell\'edizione conta come mancante', () => {
    const progress = editionCaptionProgress(
      [
        { id: 'a', caption: 'Uno' },
        { id: 'b', caption: 'Due' },
      ],
      [
        { media_id: 'a', caption: '' },
        { media_id: 'b', caption: '   ' },
      ]
    );
    expect(progress.total).toBe(2);
    expect(progress.translated).toBe(0);
    expect(progress.missingMediaIds).toEqual(['a', 'b']);
  });

  it('righe per foto inesistenti o non di galleria si ignorano', () => {
    const progress = editionCaptionProgress(
      [{ id: 'gallery-1', caption: 'Ciao' }],
      [
        { media_id: 'gallery-1', caption: 'Hello' },
        { media_id: 'gone', caption: 'orphan' },
        { media_id: 'cover-x', caption: 'cover' },
      ]
    );
    expect(progress).toEqual({
      total: 1,
      translated: 1,
      missingMediaIds: [],
    });
  });

  it('rottura: spazi soli non contano come tradotti', () => {
    const brokenTranslated = (caption: string) => Boolean(caption); // senza trim
    expect(brokenTranslated('   ')).toBe(true);
    expect(editionCaptionProgress([{ id: 'a', caption: 'X' }], [{ media_id: 'a', caption: '   ' }]).translated).toBe(
      0
    );
  });
});
