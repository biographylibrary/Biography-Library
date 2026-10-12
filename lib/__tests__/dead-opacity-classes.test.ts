/**
 * Freno: non aumentare le classi di colore con opacità fuori scala Tailwind 3.3.3
 * (non generano CSS). Non corregge il debito esistente: solo lo congela.
 *
 * Valid opacities: 0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100.
 * Esclusi: altezze di riga (text-sm/6), frazioni (w-1/2), arbitrary (bg-black/[0.45]).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');

/**
 * Misurato a fine commit 3 su questo ramo (app + components, esclusi __tests__).
 * 146 usi / 28 varianti. Claudio ne contava 149/30 a inizio giro: commit 1 toglie
 * bg-brand-blue/15 dalla banda; commit 2d toglie border-primary/35 dai badge lingua;
 * il residuo (−1) è differenza di conteggio (vedi resoconto PR).
 */
const BASELINE = 146;

const VALID_OPACITY = new Set([0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100]);

const PREFIXES = [
  'bg',
  'text',
  'border-t',
  'border-b',
  'border-l',
  'border-r',
  'border-x',
  'border-y',
  'border',
  'ring',
  'divide',
  'from',
  'to',
  'via',
  'shadow',
  'fill',
  'stroke',
  'outline',
  'placeholder',
  'decoration',
  'accent',
  'caret',
].sort((a, b) => b.length - a.length);

const STD =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

const COLOR = `(?:brand-[\\w-]+|primary|secondary|muted|accent|destructive|foreground|background|card|popover|border|input|ring|black|white|${STD})(?:-\\d{2,3})?`;

const PREFIX_ALT = PREFIXES.map((p) => p.replace(/-/g, '\\-')).join('|');

/** Varianti + prefix-color/NN, non seguito da [ (arbitrary) o altra cifra. */
const DEAD_OPACITY = new RegExp(
  `(?:^|[\\s"'\`])((?:[\\w\\[\\]\\-./]+:)*(?:${PREFIX_ALT})-(?:${COLOR})/(\\d{1,3}))(?![\\w\\[/])`,
  'g'
);

function walkTsx(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsx(full, out);
      continue;
    }
    if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function collectDead(): Array<{ file: string; line: number; token: string; opacity: number }> {
  const hits: Array<{ file: string; line: number; token: string; opacity: number }> = [];
  for (const dir of ['app', 'components']) {
    for (const file of walkTsx(join(ROOT, dir))) {
      const text = readFileSync(file, 'utf8');
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      text.split(/\n/).forEach((line, idx) => {
        for (const m of Array.from(line.matchAll(DEAD_OPACITY))) {
          const opacity = Number(m[2]);
          if (VALID_OPACITY.has(opacity)) continue;
          hits.push({ file: rel, line: idx + 1, token: m[1]!, opacity });
        }
      });
    }
  }
  return hits;
}

describe('dead opacity classes (Tailwind 3.3.3 scale)', () => {
  it('il conteggio delle classi fuori scala resta al BASELINE (non sale né scende senza aggiornarlo)', () => {
    const hits = collectDead();
    const detail = hits.map((h) => `${h.file}:${h.line} ${h.token}`).join('\n');
    if (hits.length > BASELINE) {
      expect.fail(
        `Dead opacity classes aumentate: ${hits.length} > BASELINE ${BASELINE}.\n${detail}`
      );
    }
    if (hits.length < BASELINE) {
      expect.fail(
        `Dead opacity classes diminuite: ${hits.length} < BASELINE ${BASELINE}. ` +
          `Abbassa BASELINE a ${hits.length} in lib/__tests__/dead-opacity-classes.test.ts.\n${detail}`
      );
    }
    expect(hits.length).toBe(BASELINE);
  });
});
