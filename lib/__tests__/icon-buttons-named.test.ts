// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Un pulsante che contiene solo un'icona non ha un nome per chi usa un lettore di schermo: serve
 * `aria-label` (o testo nascosto `sr-only`). Il controllo legge i file dei componenti e cerca
 * `<Button>` e `<button>` il cui contenuto è una sola icona, senza testo e senza nome.
 */
const ROOTS = ['components', 'app'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' || name === 'node_modules' ? [] : files(full);
    return full.endsWith('.tsx') ? [full] : [];
  });
}

const BUTTON = /<(Button|button)\b((?:[^<>]|=>|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*)>\s*(<[A-Z][A-Za-z0-9]*\b[^<>]*\/>)\s*<\/\1>/g;

describe("pulsanti con solo un'icona", () => {
  it('hanno tutti un nome accessibile', () => {
    const senzaNome: string[] = [];
    for (const root of ROOTS) {
      for (const file of files(root)) {
        const source = readFileSync(file, 'utf8');
        for (const m of Array.from(source.matchAll(BUTTON))) {
          const attrs = m[2];
          if (/aria-label=|aria-labelledby=|\{\.\.\.props\}/.test(attrs)) continue;
          const line = source.slice(0, m.index).split('\n').length;
          senzaNome.push(`${file}:${line}`);
        }
      }
    }
    expect(senzaNome).toEqual([]);
  });
});
