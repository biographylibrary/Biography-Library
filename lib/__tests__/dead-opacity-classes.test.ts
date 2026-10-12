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
 * Commit 5 (rifiniture-avvisi-palette): portato a 0 — divieto assoluto.
 */
const BASELINE = 0;

/** Allowlist vuota: nessuna scala Tailwind standard ammessa in app/components. */
export const ALLOWED_TAILWIND_SCALE: string[] = [];

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

const SCALE_HUES =
  'amber|emerald|red|neutral|sky|slate|gray|zinc|stone|orange|yellow|lime|green|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|rose';

const SCALE_PREFIXES =
  'bg|text|border|ring|divide|outline|fill|stroke|from|via|to|decoration|placeholder|accent|caret|shadow';

/** Varianti dark:/hover: + prefix-(hue)-NUMBER(+ optional /opacity). */
/** Qualsiasi catena di varianti (dark:, data-[state=open]:, peer-checked:, …). */
const TAILWIND_SCALE = new RegExp(
  `(?:^|[\\s"'\`])((?:[\\w\\[\\]=\\-.%/]+:)*(?:${SCALE_PREFIXES})-(?:${SCALE_HUES})-\\d{1,3}(?:/\\d{1,3})?)(?![\\w\\[/])`,
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

function collectScale(): Array<{ file: string; line: number; token: string }> {
  const hits: Array<{ file: string; line: number; token: string }> = [];
  for (const dir of ['app', 'components']) {
    for (const file of walkTsx(join(ROOT, dir))) {
      const text = readFileSync(file, 'utf8');
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      text.split(/\n/).forEach((line, idx) => {
        for (const m of Array.from(line.matchAll(TAILWIND_SCALE))) {
          const token = m[1]!;
          if (ALLOWED_TAILWIND_SCALE.includes(token)) continue;
          hits.push({ file: rel, line: idx + 1, token });
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

describe('banned Tailwind color scales in app/components', () => {
  it('nessuna classe prefix-(hue)-NUMBER fuori allowlist', () => {
    const hits = collectScale();
    const detail = hits.map((h) => `${h.file}:${h.line} ${h.token}`).join('\n');
    if (hits.length > 0) {
      expect.fail(
        `Scale Tailwind vietate (${hits.length}). Usa brand-* / tone-* / semantic tokens.\n${detail}`
      );
    }
    expect(hits.length).toBe(0);
  });
});
