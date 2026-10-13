import { describe, expect, it } from 'vitest';
import {
  buildEditionAlternates,
  siteOrigin,
  type EditionAlternateRow,
} from '@/lib/edition-alternates';

function row(
  partial: Partial<EditionAlternateRow> & Pick<EditionAlternateRow, 'id' | 'record_language_tag'>
): EditionAlternateRow {
  return {
    id: partial.id,
    slug: partial.slug ?? null,
    record_language_tag: partial.record_language_tag,
    translation_of: partial.translation_of ?? null,
    status: partial.status ?? 'published',
    visibility: partial.visibility ?? 'public',
  };
}

describe('siteOrigin', () => {
  it('strips a trailing slash', () => {
    expect(siteOrigin('https://example.com/')).toBe('https://example.com');
  });

  it('falls back when empty', () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(siteOrigin(null)).toBe('https://app.biographylibrary.org');
    expect(siteOrigin('')).toBe('https://app.biographylibrary.org');
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});

describe('buildEditionAlternates', () => {
  const original = row({ id: 'o1', slug: 'vita', record_language_tag: 'it' });
  const fr = row({ id: 'e-fr', slug: 'vita-fr', record_language_tag: 'fr', translation_of: 'o1' });
  const de = row({ id: 'e-de', slug: null, record_language_tag: 'de', translation_of: 'o1' });

  it('builds three language entries plus x-default on the original', () => {
    const result = buildEditionAlternates({
      rows: [original, fr, de],
      origin: 'https://app.example',
      currentId: 'e-fr',
    });
    expect(result?.canonical).toBe('https://app.example/biography/vita-fr/view');
    expect(result?.languages).toEqual({
      it: 'https://app.example/biography/vita/view',
      fr: 'https://app.example/biography/vita-fr/view',
      de: 'https://app.example/biography/e-de/view',
      'x-default': 'https://app.example/biography/vita/view',
    });
    expect(result?.languages?.['x-default']).toBe(result?.languages?.it);
    expect(result?.languages?.['x-default']).not.toBe(result?.languages?.fr);
  });

  it('drops unpublished, non-public, and untagged rows', () => {
    const result = buildEditionAlternates({
      rows: [
        original,
        fr,
        row({ id: 'draft', record_language_tag: 'en', translation_of: 'o1', status: 'draft' }),
        row({
          id: 'private',
          record_language_tag: 'es',
          translation_of: 'o1',
          visibility: 'private',
        }),
        row({ id: 'notag', record_language_tag: null, translation_of: 'o1' }),
        row({ id: 'blank', record_language_tag: '  ', translation_of: 'o1' }),
      ],
      origin: 'https://app.example',
      currentId: 'o1',
    });
    expect(Object.keys(result?.languages ?? {}).sort()).toEqual(
      ['fr', 'it', 'x-default'].sort()
    );
  });

  it('returns only canonical when a single public version remains', () => {
    const result = buildEditionAlternates({
      rows: [
        original,
        row({ id: 'draft', record_language_tag: 'en', translation_of: 'o1', status: 'draft' }),
      ],
      origin: 'https://app.example',
      currentId: 'o1',
    });
    expect(result).toEqual({
      canonical: 'https://app.example/biography/vita/view',
    });
    expect(result?.languages).toBeUndefined();
  });

  it('prefers slug over id in paths', () => {
    const result = buildEditionAlternates({
      rows: [original, fr],
      origin: 'https://app.example',
      currentId: 'o1',
    });
    expect(result?.canonical).toContain('/biography/vita/view');
    expect(result?.languages?.fr).toContain('/biography/vita-fr/view');
  });

  it('accepts an origin with a trailing slash', () => {
    const result = buildEditionAlternates({
      rows: [original, fr],
      origin: 'https://app.example/',
      currentId: 'o1',
    });
    expect(result?.canonical).toBe('https://app.example/biography/vita/view');
  });
});
