import { describe, expect, it, vi } from 'vitest';
import { resolveEditionIdentity } from '@/lib/edition-identity';
import {
  buildColophonLines,
  buildPermanenceHeaderLines,
  buildPermanencePlainText,
  type PermanenceExportBiography,
} from '@/lib/permanence-text-export';

const VALID_UM = 'um0000k3nq7fx2mvp4';
const CANONICAL_UM = 'UM-0000-K3NQ-7FX2-MVP4';
const UM_BASE = 'https://id.biographylibrary.org';

function clientWithRows(
  byId: Record<string, { um_id?: string | null; translation_of?: string | null } | null>
) {
  return {
    from: () => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: vi.fn(async () => ({
            data: Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null,
            error: null,
          })),
        }),
      }),
    }),
  };
}

function baseBio(
  overrides: Partial<PermanenceExportBiography> = {}
): PermanenceExportBiography {
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
    published_at_iso: '2026-09-03',
    published_um_year: 0,
    rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    content_freeflow: '<p>Una vita.</p>',
    biography_mode: 'freeflow',
    ...overrides,
  };
}

/** Output byte-identico tra um_id diretto e identity risolta. */
function expectPermanenceByteIdentical(
  bioDirect: PermanenceExportBiography,
  bioViaIdentity: PermanenceExportBiography
) {
  expect(buildPermanenceHeaderLines(bioViaIdentity, []).join('\n')).toBe(
    buildPermanenceHeaderLines(bioDirect, []).join('\n')
  );
  expect(buildColophonLines(bioViaIdentity, 'UM', 'it', UM_BASE).join('\n')).toBe(
    buildColophonLines(bioDirect, 'UM', 'it', UM_BASE).join('\n')
  );
  expect(buildPermanencePlainText(bioViaIdentity, [], [], undefined, UM_BASE)).toBe(
    buildPermanencePlainText(bioDirect, [], [], undefined, UM_BASE)
  );
}

describe('edition permanence identity — originali', () => {
  const cases: Array<{
    name: string;
    bioId: string;
    row: { um_id: string | null; translation_of: null };
    bioOverrides: Partial<PermanenceExportBiography>;
  }> = [
    {
      name: 'pubblicato con um_id',
      bioId: 'orig-published',
      row: { um_id: VALID_UM, translation_of: null },
      bioOverrides: {},
    },
    {
      name: 'published_at null (senza indirizzo di risoluzione datato)',
      bioId: 'orig-no-date',
      row: { um_id: VALID_UM, translation_of: null },
      bioOverrides: { published_at_iso: null, published_um_year: null },
    },
    {
      name: 'um_id assente',
      bioId: 'orig-no-um',
      row: { um_id: null, translation_of: null },
      bioOverrides: { um_id: null },
    },
    {
      name: 'um_id assente e published_at null',
      bioId: 'orig-bare',
      row: { um_id: null, translation_of: null },
      bioOverrides: {
        um_id: null,
        published_at_iso: null,
        published_um_year: null,
        rights_statement_uri: null,
      },
    },
    {
      name: 'um_id vuoto (trattato come assente) e data presente',
      bioId: 'orig-empty-um',
      row: { um_id: '', translation_of: null },
      bioOverrides: { um_id: null, published_at_iso: '2026-06-26', published_um_year: 0 },
    },
  ];

  it.each(cases)(
    'resolveEditionIdentity + permanence helpers byte-identici: $name',
    async ({ bioId, row, bioOverrides }) => {
      const client = clientWithRows({ [bioId]: row });
      const identity = await resolveEditionIdentity(client, bioId);
      const expectedOwn =
        typeof row.um_id === 'string' && row.um_id.trim() ? row.um_id : null;
      expect(identity).toBe(expectedOwn);

      const bio = baseBio({ ...bioOverrides, um_id: expectedOwn });
      const bioViaIdentity = { ...bio, um_id: identity };
      expectPermanenceByteIdentical(bio, bioViaIdentity);

      if (expectedOwn) {
        const plain = buildPermanencePlainText(bioViaIdentity, [], [], undefined, UM_BASE);
        expect(plain).toContain(CANONICAL_UM);
      }
    }
  );
});

describe('edition permanence identity — edizioni', () => {
  it('usa um_id dell\'originale; um_id dell\'edizione resta null sull\'oggetto bio', async () => {
    const client = clientWithRows({
      'ed-1': { um_id: null, translation_of: 'orig-1' },
      'orig-1': { um_id: VALID_UM, translation_of: null },
    });

    const editionBio = baseBio({
      um_id: null,
      title: 'Maria Rossi (FR)',
      record_language_tag: 'fr',
      record_language_endonym: 'français',
      content_freeflow: '<p>Une vie.</p>',
    });
    expect(editionBio.um_id).toBeNull();

    const identity = await resolveEditionIdentity(client, 'ed-1');
    expect(identity).toBe(VALID_UM);
    // L'oggetto bio dell'edizione non viene mutato.
    expect(editionBio.um_id).toBeNull();

    const forPermanence = { ...editionBio, um_id: identity };
    expect(editionBio.um_id).toBeNull();

    const header = buildPermanenceHeaderLines(forPermanence, []).join('\n');
    const colophon = buildColophonLines(forPermanence, 'UM', 'fr', UM_BASE).join('\n');
    const plain = buildPermanencePlainText(forPermanence, [], [], undefined, UM_BASE);

    expect(header).toContain(CANONICAL_UM);
    expect(colophon).toContain(CANONICAL_UM);
    expect(plain).toContain(CANONICAL_UM);
    expect(plain).toContain(`${UM_BASE}/${CANONICAL_UM}`);

    // Stesso output di un originale con lo stesso um_id e stessi metadati export.
    const asOriginal = { ...editionBio, um_id: VALID_UM };
    expectPermanenceByteIdentical(asOriginal, forPermanence);
  });

  it('edizione con originale senza um_id: identity null, export come UNKNOWN', async () => {
    const client = clientWithRows({
      'ed-2': { um_id: null, translation_of: 'orig-2' },
      'orig-2': { um_id: null, translation_of: null },
    });

    const editionBio = baseBio({
      um_id: null,
      published_at_iso: null,
      published_um_year: null,
    });
    const identity = await resolveEditionIdentity(client, 'ed-2');
    expect(identity).toBeNull();
    expect(editionBio.um_id).toBeNull();

    const forPermanence = { ...editionBio, um_id: identity };
    const plain = buildPermanencePlainText(forPermanence, [], [], undefined, UM_BASE);
    expect(plain).toContain('sconosciuto | UNKNOWN');
    expect(plain).not.toContain(CANONICAL_UM);
    expect(editionBio.um_id).toBeNull();
  });
});
