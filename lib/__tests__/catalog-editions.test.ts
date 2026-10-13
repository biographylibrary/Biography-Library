import { describe, expect, it } from 'vitest';
import { mergeEditionsByOriginal } from '@/lib/catalog-editions';
import { languageOptions } from '@/lib/work-languages';

describe('mergeEditionsByOriginal (catalogo, niente sfarfallio)', () => {
  it('unisce le edizioni prima che il filtro le usi; non perde righe già note', () => {
    const prev = {
      'orig-1': [{ id: 'ed-a', translation_of: 'orig-1' }],
    };
    const incoming = [
      { id: 'ed-b', translation_of: 'orig-1' },
      { id: 'ed-c', translation_of: 'orig-2' },
    ];
    const merged = mergeEditionsByOriginal(prev, incoming);
    expect(merged['orig-1']!.map((e) => e.id).sort()).toEqual(['ed-a', 'ed-b']);
    expect(merged['orig-2']!.map((e) => e.id)).toEqual(['ed-c']);
    // Ingresso non mutato.
    expect(prev['orig-1']).toHaveLength(1);
  });

  it('prova di rottura: applicare allBios senza edizioni darebbe filtro incompleto', () => {
    // Simula l'ordine sbagliato: lista piena, edizioni ancora vuote.
    const allBios = [{ id: 'orig-1' }, { id: 'orig-2' }];
    const editionsTooEarly: Record<string, { id: string; translation_of: string }[]> = {};
    const withFr = allBios.filter((b) =>
      (editionsTooEarly[b.id] ?? []).some((e) => e.id.startsWith('ed-fr'))
    );
    expect(withFr).toHaveLength(0);

    const editionsReady = mergeEditionsByOriginal(
      {},
      [{ id: 'ed-fr', translation_of: 'orig-1' }]
    );
    const withFrReady = allBios.filter((b) =>
      (editionsReady[b.id] ?? []).some((e) => e.id === 'ed-fr')
    );
    expect(withFrReady).toHaveLength(1);
  });
});

describe('languageMenu da tag + lingua UI (niente ricarica)', () => {
  it('gli stessi tag producono etichette diverse per lingua UI senza toccare i tag', () => {
    const tags = ['it', 'lij', 'fr'];
    const itMenu = languageOptions(tags, 'it');
    const enMenu = languageOptions(tags, 'en');
    expect(itMenu.map((o) => o.value)).toEqual(enMenu.map((o) => o.value));
    expect(itMenu.find((o) => o.value === 'lij')?.label).not.toBe(
      enMenu.find((o) => o.value === 'lij')?.label
    );
  });
});
