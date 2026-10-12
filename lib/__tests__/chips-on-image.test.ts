/**
 * Chip sopra foto: tone-on-image e dark:invert sul logo Pioneer (sorgente come testo).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');

describe('chips on image (source)', () => {
  it('PioneerBadge: tone-info con tone-on-image e logo con dark:invert', () => {
    const src = readFileSync(join(ROOT, 'components/biography/PioneerBadge.tsx'), 'utf8');
    const toneLine = src.split(/\n/).find((l) => /\btone-info\b/.test(l));
    expect(toneLine, 'riga con tone-info assente').toBeTruthy();
    expect(toneLine).toMatch(/\btone-on-image\b/);

    const logoLine = src.split(/\n/).find(
      (l) => /logo-black\.svg/.test(l) || (/<Image\b/.test(l) && /className=/.test(l))
    );
    expect(logoLine, 'riga Image/logo assente').toBeTruthy();
    expect(logoLine).toMatch(/\bdark:invert\b/);
  });

  it('biographies Featured chip: tone-warning con tone-on-image', () => {
    const src = readFileSync(join(ROOT, 'app/biographies/page.tsx'), 'utf8');
    // JSX multilinea: attributi dello <span> con tone-warning il cui corpo (breve) contiene Featured o <Star
    const m = src.match(
      /<span\b([^>]*\btone-warning\b[^>]*)>[\s\S]{0,160}?(?:Featured|<Star\b)/
    );
    expect(m, 'span Featured/Star con tone-warning non trovato').toBeTruthy();
    expect(m![1]).toMatch(/\btone-on-image\b/);
  });
});
