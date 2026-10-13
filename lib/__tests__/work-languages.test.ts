import { describe, expect, it } from 'vitest';
import {
  buildWorkVersions,
  languageBase,
  languageOptions,
  pickDisplayVersion,
  versionMatchesLanguage,
  workMatchesLanguage,
  workMatchesSearch,
  type WorkVersion,
} from '@/lib/work-languages';

const original = {
  id: 'orig',
  slug: 'vita',
  title: 'La mia vita',
  subjectName: null as string | null,
  tag: 'it',
};

function edition(
  partial: Partial<WorkVersion> & { id: string; tag: string; title: string }
): {
  id: string;
  slug: string | null;
  title: string;
  subjectName: string | null;
  tag: string;
} {
  return {
    id: partial.id,
    slug: partial.slug ?? null,
    title: partial.title,
    subjectName: partial.subjectName ?? null,
    tag: partial.tag,
  };
}

describe('buildWorkVersions', () => {
  it('puts the original first and sorts editions by tag', () => {
    const versions = buildWorkVersions(original, [
      edition({ id: 'fr', tag: 'fr', title: 'Ma vie' }),
      edition({ id: 'de', tag: 'de', title: 'Mein Leben' }),
    ]);
    expect(versions.map((v) => v.tag)).toEqual(['it', 'de', 'fr']);
    expect(versions[0]?.isOriginal).toBe(true);
    expect(versions.slice(1).every((v) => !v.isOriginal)).toBe(true);
  });

  it('drops editions without a tag', () => {
    const versions = buildWorkVersions(original, [
      { id: 'x', slug: null, title: 'X', subjectName: null, tag: null },
      { id: 'y', slug: null, title: 'Y', subjectName: null, tag: '   ' },
      edition({ id: 'en', tag: 'en', title: 'My life' }),
    ]);
    expect(versions.map((v) => v.id)).toEqual(['orig', 'en']);
  });

  it('keeps the first edition when tags duplicate', () => {
    const versions = buildWorkVersions(original, [
      edition({ id: 'fr1', tag: 'fr', title: 'Première' }),
      edition({ id: 'fr2', tag: 'fr', title: 'Seconde' }),
    ]);
    expect(versions.filter((v) => v.tag === 'fr')).toHaveLength(1);
    expect(versions.find((v) => v.tag === 'fr')?.id).toBe('fr1');
  });
});

describe('languageBase', () => {
  it('maps it-CH to it', () => {
    expect(languageBase('it-CH')).toBe('it');
  });
});

describe('versionMatchesLanguage / workMatchesLanguage', () => {
  it('matches it filter against it-CH', () => {
    const version: WorkVersion = {
      id: '1',
      slug: null,
      title: 'T',
      subjectName: null,
      tag: 'it-CH',
      isOriginal: true,
    };
    expect(versionMatchesLanguage(version, 'it')).toBe(true);
    expect(workMatchesLanguage([version], 'it')).toBe(true);
    expect(workMatchesLanguage([version], 'fr')).toBe(false);
  });
});

describe('pickDisplayVersion', () => {
  const versions = buildWorkVersions(original, [
    edition({ id: 'fr', tag: 'fr', title: 'Histoire française', subjectName: 'Sujet FR' }),
    edition({ id: 'en', tag: 'en', title: 'English story' }),
  ]);

  it('with language filter picks the matching edition', () => {
    const picked = pickDisplayVersion({
      versions,
      languageFilter: 'fr',
      searchText: '',
      authorName: 'Mario',
    });
    expect(picked.id).toBe('fr');
  });

  it('with language filter and two versions of the same base prefers the original', () => {
    const bothIt = buildWorkVersions(
      { ...original, tag: 'it' },
      [edition({ id: 'it-ch', tag: 'it-CH', title: 'Edizione CH' })]
    );
    const picked = pickDisplayVersion({
      versions: bothIt,
      languageFilter: 'it',
      searchText: '',
    });
    expect(picked.id).toBe('orig');
    expect(picked.isOriginal).toBe(true);
  });

  it('with search that hits only an edition title picks that edition', () => {
    const picked = pickDisplayVersion({
      versions,
      languageFilter: null,
      searchText: 'française',
      authorName: 'Mario',
    });
    expect(picked.id).toBe('fr');
  });

  it('with no filter and no search returns the original', () => {
    const picked = pickDisplayVersion({
      versions,
      languageFilter: 'all',
      searchText: '',
      authorName: 'Mario',
    });
    expect(picked.id).toBe('orig');
  });
});

describe('workMatchesSearch', () => {
  const versions = buildWorkVersions(original, [
    edition({ id: 'fr', tag: 'fr', title: 'Histoire française', subjectName: 'Jean Dupont' }),
  ]);

  it('matches an edition title', () => {
    expect(
      workMatchesSearch({ versions, authorName: 'Mario', searchText: 'française' })
    ).toBe(true);
  });

  it('matches an edition subject name', () => {
    expect(
      workMatchesSearch({ versions, authorName: 'Mario', searchText: 'dupont' })
    ).toBe(true);
  });

  it('matches the author name', () => {
    expect(
      workMatchesSearch({ versions, authorName: 'Mario Rossi', searchText: 'rossi' })
    ).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(
      workMatchesSearch({ versions, authorName: 'Mario', searchText: 'FRANÇAISE' })
    ).toBe(true);
  });

  it('normalises NFC', () => {
    const composed = 'café';
    const decomposed = 'cafe\u0301';
    const nfcVersions = buildWorkVersions(
      { ...original, title: composed },
      []
    );
    expect(
      workMatchesSearch({ versions: nfcVersions, authorName: '', searchText: decomposed })
    ).toBe(true);
  });
});

describe('languageOptions', () => {
  it('deduplicates regional tags under the base language and sorts by UI name', () => {
    const options = languageOptions(['it-CH', 'it', 'fr', 'de', 'fr-BE'], 'en');
    // English display names: French, German, Italian → fr, de, it
    expect(options.map((o) => o.value)).toEqual(['fr', 'de', 'it']);
    expect(options).toHaveLength(3);
    expect(options[0]?.label.toLowerCase()).toContain('french');
  });
});
