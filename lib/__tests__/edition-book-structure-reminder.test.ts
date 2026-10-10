import { describe, expect, it } from 'vitest';
import { missingBookStructurePartsComparedToOriginal } from '@/lib/edition-book-structure-reminder';

describe('missingBookStructurePartsComparedToOriginal', () => {
  it('elenca le parti compilate nell\'originale e assenti nell\'edizione', () => {
    const missing = missingBookStructurePartsComparedToOriginal(
      {
        include_author_copyright_page: true,
        dedication_enabled: true,
        dedication_content: 'A mia madre',
        epigraph_enabled: true,
        epigraph_content: 'Una citazione',
        preface_enabled: false,
        preface_content: 'non conta',
      },
      {
        include_author_copyright_page: false,
        dedication_enabled: true,
        dedication_content: 'To my mother',
        epigraph_enabled: false,
        epigraph_content: '',
      }
    );
    expect(missing).toEqual(['authorCopyrightPage', 'epigraph']);
  });

  it('è vuoto quando l\'edizione ha già tutto ciò che l\'originale ha compilato', () => {
    const snap = {
      dedication_enabled: true,
      dedication_content: 'Ciao',
      epigraph_enabled: true,
      epigraph_content: 'Quote',
    };
    expect(missingBookStructurePartsComparedToOriginal(snap, snap)).toEqual([]);
  });

  it('tratta l\'edizione senza riga come tutto mancante rispetto all\'originale', () => {
    expect(
      missingBookStructurePartsComparedToOriginal(
        {
          dedication_enabled: true,
          dedication_content: 'Dedica',
          acknowledgements_enabled: true,
          acknowledgements_content: 'Grazie',
        },
        null
      )
    ).toEqual(['dedication', 'acknowledgements']);
  });

  it('ignora parti abilitate ma senza testo', () => {
    expect(
      missingBookStructurePartsComparedToOriginal(
        { dedication_enabled: true, dedication_content: '   ' },
        null
      )
    ).toEqual([]);
  });
});
