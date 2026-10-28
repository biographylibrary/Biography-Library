import { describe, expect, it } from 'vitest';
import { HELP_KB_SECTIONS, KB_LOCALES } from '@/lib/agents/kb/help-kb-sections';
import {
  KB_CHUNK_MAX_CHARS,
  KB_MAX_PER_SECTION,
  buildKbQuery,
  keywordOverlap,
  keywordStems,
  pickKbChunks,
  rankKbChunks,
  splitKbSection,
} from '@/lib/agents/rag/kb-ranking';

const flat = (t: string) => t.replace(/\s+/g, ' ').trim();

describe('splitKbSection', () => {
  it('non spezza un indirizzo web né una sigla con il punto, e non aggiunge spazi', () => {
    const text = `${'Una frase normale della guida. '.repeat(30)}Scrivi a https://biographylibrary.org/contacts per dubbi, per esempio (e.g. un caso). Fine.`;
    const chunks = splitKbSection(text, 200);
    expect(chunks.join(' ')).toContain('https://biographylibrary.org/contacts');
    expect(flat(chunks.join(' '))).toBe(flat(text));
  });

  it('un testo breve resta un pezzo solo, uno vuoto nessuno', () => {
    expect(splitKbSection('Una frase. Un\'altra.')).toEqual(["Una frase. Un'altra."]);
    expect(splitKbSection('   ')).toEqual([]);
  });

  it('taglia solo a confine di frase e non perde niente', () => {
    const text = Array.from({ length: 30 }, (_, i) => `Questa è la frase numero ${i + 1} della guida.`).join(' ');
    const chunks = splitKbSection(text, 200);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(200);
      expect(c.startsWith('Questa è la frase')).toBe(true);
      expect(c.endsWith('guida.')).toBe(true);
    }
    expect(flat(chunks.join(' '))).toBe(flat(text));
  });

  it('una frase sola più lunga del limite resta intera', () => {
    const long = `${'parola '.repeat(200)}fine.`;
    expect(splitKbSection(long, 100)).toEqual([long.trim()]);
  });

  for (const locale of KB_LOCALES) {
    it(`guida in ${locale}: nessun pezzo oltre il limite (salvo frase unica), nessun testo perso`, () => {
      for (const section of HELP_KB_SECTIONS) {
        const text = section.content[locale];
        const chunks = splitKbSection(text);
        expect(flat(chunks.join(' '))).toBe(flat(text));
        for (const c of chunks) {
          if (c.length > KB_CHUNK_MAX_CHARS) expect(c.split(/[.!?]\s/).length).toBe(1);
        }
      }
    });

    it(`guida in ${locale}: il limite del controllo grammaticale sta in un pezzo che parla di grammatica`, () => {
      const section = HELP_KB_SECTIONS.find((s) => s.sourceKey === 'ai_tools')!;
      const chunk = splitKbSection(section.content[locale]).find((c) => c.includes('4000'));
      expect(chunk).toBeTruthy();
      expect(chunk!.toLowerCase()).toMatch(/grammat|grammar|grammatik/);
    });
  }
});

describe('parole in comune', () => {
  it('le radici ignorano accenti, maiuscole e parole vuote', () => {
    expect(keywordStems('Qual è il LIMITE di caratteri per la Grammatica?')).toEqual(
      expect.arrayContaining(['limit', 'carat', 'gramm'])
    );
    expect(keywordStems('come posso fare')).toEqual([]);
  });

  it('quota delle parole della domanda presenti nel pezzo', () => {
    const stems = keywordStems('limite caratteri selezione');
    expect(keywordOverlap(stems, 'Seleziona fino a 4000 caratteri; sopra il limite compare un avviso.')).toBeGreaterThan(0.6);
    expect(keywordOverlap(stems, 'Le foto arrivano fino a 20 MB.')).toBe(0);
    expect(keywordOverlap([], 'qualsiasi testo')).toBe(0);
  });
});

describe('rankKbChunks e pickKbChunks', () => {
  const unit = (x: number, y: number) => [x, y];

  it('una parola in comune porta in alto il pezzo giusto anche se il significato è lontano', () => {
    const rows = [
      { sourceKey: 'a', content: 'Cose di grammatica in generale senza numeri.', embedding: unit(1, 0.3) },
      { sourceKey: 'b', content: 'Il limite è di 4000 caratteri selezionati.', embedding: unit(0.8, 0.6) },
    ];
    const ranked = rankKbChunks(unit(1, 0), 'qual è il limite di caratteri selezionati?', rows);
    expect(ranked[0].sourceKey).toBe('b');
  });

  it('al massimo due pezzi per sezione e k pezzi in tutto', () => {
    const scored = [
      { sourceKey: 'a', content: '1', score: 0.9 },
      { sourceKey: 'a', content: '2', score: 0.8 },
      { sourceKey: 'a', content: '3', score: 0.7 },
      { sourceKey: 'b', content: '4', score: 0.6 },
      { sourceKey: 'c', content: '5', score: 0.5 },
    ];
    const picked = pickKbChunks(scored, [], 4);
    expect(picked.map((p) => p.content)).toEqual(['1', '2', '4', '5']);
    expect(picked.filter((p) => p.sourceKey === 'a')).toHaveLength(KB_MAX_PER_SECTION);
  });

  it('i pezzi fissati vengono per primi e non si ripetono', () => {
    const scored = [{ sourceKey: 'a', content: 'x', score: 0.9 }];
    const picked = pickKbChunks(scored, [{ sourceKey: 'a', content: 'x' }, { sourceKey: 'z', content: 'y' }], 5);
    expect(picked).toEqual([
      { sourceKey: 'a', content: 'x' },
      { sourceKey: 'z', content: 'y' },
    ]);
  });
});

describe('buildKbQuery', () => {
  const history = [
    { role: 'user', content: 'Come funziona il controllo grammaticale?' },
    { role: 'assistant', content: 'Selezioni un brano e premi Controlla Grammatica.' },
  ];

  it('una domanda breve porta con sé il contesto della conversazione', () => {
    const q = buildKbQuery("c'è un limite?", history);
    expect(q).toContain('controllo grammaticale');
    expect(q).toContain('Controlla Grammatica');
    expect(q.endsWith("c'è un limite?")).toBe(true);
  });

  it('una domanda lunga resta com\'è', () => {
    const long = 'Vorrei capire bene '.repeat(10);
    expect(buildKbQuery(long, history)).toBe(long.trim());
  });

  it('senza storia è la sola domanda', () => {
    expect(buildKbQuery('  ciao  ', [])).toBe('ciao');
  });
});
