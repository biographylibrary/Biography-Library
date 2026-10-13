import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOC = join(__dirname, '../../docs/DESIGN.md');

describe('docs/DESIGN.md §1 tipografia', () => {
  it('documenta peso 400, ambiti del grassetto e famiglie editor/lettura', () => {
    const src = readFileSync(DOC, 'utf8');
    expect(src).toContain('Ultimo aggiornamento: ottobre 2026');
    expect(src).toContain('nessun peso bold globale (tutto a `font-weight: 400`)');
    expect(src).toContain(
      'il grassetto (700) esiste solo nel testo scritto dall\'autore (`.ProseMirror` e `.rich-text`) e nelle risposte di Echo (`.echo-reply`)'
    );
    expect(src).toContain(
      'nell\'editor il corpo del testo è in sans e i titoli in serif'
    );
    expect(src).toContain('sans (Noto Sans)');
    expect(src).toContain('serif (Noto Serif)');
  });
});
