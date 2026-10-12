/**
 * Contrasti WCAG dei blocchi .tone-* in app/globals.css.
 * Formula WCAG 2.x relative luminance / contrast ratio.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  composite,
  contrast,
  parseCssColor,
  parseHex,
  parseRgbModern,
  type RGB,
} from './helpers/wcag';

const ROOT = join(__dirname, '../..');
const CSS_PATH = join(ROOT, 'app/globals.css');

function extractThemeBlock(css: string, scope: 'root' | 'dark'): string {
  const block =
    scope === 'root'
      ? css.match(/:root\s*\{([\s\S]*?)\n  \}/)?.[1]
      : css.match(/\.dark\s*\{([\s\S]*?)\n  \}/)?.[1];
  if (!block) throw new Error(`no ${scope} block`);
  return block;
}

function readToken(block: string, name: string): RGB {
  const m = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`no --${name}`);
  return parseCssColor(m[1].trim());
}

function extractToneBlocks(css: string): {
  light: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }>;
  dark: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }>;
} {
  const light: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }> = {};
  const dark: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }> = {};

  const lightText = parseHex('#121212');
  const darkText = parseHex('#FDFBF7');

  for (const tone of ['info', 'success', 'warning', 'danger'] as const) {
    const lightBgRe = new RegExp(
      `\\.tone-${tone}\\s*\\{\\s*background-color:\\s*([^;]+);`
    );
    const darkBgRe = new RegExp(
      `\\.dark \\.tone-${tone}\\s*\\{\\s*background-color:\\s*([^;]+);`
    );
    const lm = css.match(lightBgRe);
    const dm = css.match(darkBgRe);
    if (!lm || !dm) throw new Error(`missing tone-${tone} backgrounds`);
    const lightBgRaw = lm[1].trim();
    const darkBgRaw = dm[1].trim();
    const lightBg = lightBgRaw.startsWith('#')
      ? parseHex(lightBgRaw)
      : parseRgbModern(lightBgRaw);
    const darkBg = darkBgRaw.startsWith('#')
      ? parseHex(darkBgRaw)
      : parseRgbModern(darkBgRaw);
    if (!lightBg || !darkBg) throw new Error(`parse fail tone-${tone}`);
    light[tone] = { bg: lightBg, color: lightText, borderFrom: 'var' };
    dark[tone] = { bg: darkBg, color: darkText, borderFrom: 'var' };
  }

  if (!/\.tone-info,\s*\.tone-success,\s*\.tone-warning,\s*\.tone-danger\s*\{[\s\S]*?color:\s*#121212/.test(css)) {
    throw new Error('light tone text color missing or not #121212');
  }
  if (!/\.dark \.tone-info,\s*\.dark \.tone-success,\s*\.dark \.tone-warning,\s*\.dark \.tone-danger\s*\{[\s\S]*?color:\s*#FDFBF7/.test(css)) {
    throw new Error('dark tone text color missing or not #FDFBF7');
  }

  return { light, dark };
}

function extractBorder(css: string, scope: 'root' | 'dark'): RGB {
  return readToken(extractThemeBlock(css, scope), 'border');
}

describe('notice tone contrast (WCAG)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const tones = extractToneBlocks(css);
  const borderLight = extractBorder(css, 'root');
  const borderDark = extractBorder(css, 'dark');

  const rootBlock = extractThemeBlock(css, 'root');
  const darkBlock = extractThemeBlock(css, 'dark');

  const LIGHT_BASES = {
    page: readToken(rootBlock, 'bg-main'),
    card: readToken(rootBlock, 'card'),
  } as const;

  const DARK_BASES = {
    page: readToken(darkBlock, 'bg-main'),
    card: readToken(darkBlock, 'card'),
    muted: readToken(darkBlock, 'muted'),
  } as const;

  it('testo su fondo composto ≥7:1 in chiaro e ≥4.5:1 in scuro (pagina e scheda)', () => {
    const failures: string[] = [];
    for (const tone of Object.keys(tones.light)) {
      for (const [baseName, base] of Object.entries(LIGHT_BASES)) {
        const composed = composite(tones.light[tone].bg, base);
        const ratio = contrast(tones.light[tone].color, composed);
        if (ratio < 7) {
          failures.push(`light ${tone} on ${baseName}: ${ratio.toFixed(2)}`);
        }
      }
    }
    for (const tone of Object.keys(tones.dark)) {
      for (const [baseName, base] of Object.entries(DARK_BASES)) {
        // page + card: soglia ≥4.5; muted letto dal CSS (hover) e incluso nella stessa soglia
        const composed = composite(tones.dark[tone].bg, base);
        const ratio = contrast(tones.dark[tone].color, composed);
        if (ratio < 4.5) {
          failures.push(`dark ${tone} on ${baseName}: ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('bordo contro base ≥4.5:1 in chiaro (pagina e scheda) e ≥3:1 in scuro sulla pagina', () => {
    const failures: string[] = [];
    for (const [baseName, base] of Object.entries(LIGHT_BASES)) {
      const ratio = contrast(borderLight, base);
      if (ratio < 4.5) failures.push(`light border on ${baseName}: ${ratio.toFixed(2)}`);
    }
    const darkPage = contrast(borderDark, DARK_BASES.page);
    if (darkPage < 3) failures.push(`dark border on page: ${darkPage.toFixed(2)}`);
    const darkCard = contrast(borderDark, DARK_BASES.card);
    if (darkCard < 3) failures.push(`dark border on card: ${darkCard.toFixed(2)}`);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('i soli colori di testo in .tone-* sono brand-ink (#121212) e brand-beigeLight (#FDFBF7)', () => {
    // Solo la proprietà `color` sulle regole `.tone-*` (non discendenti come `.tone-info .text-muted-foreground`).
    const lightColorDecls = Array.from(
      css.matchAll(/(?<!\.dark )\.tone-[a-z]+(?:,\s*\.tone-[a-z]+)*\s*\{[^}]*(?<![\w-])color:\s*([^;]+);/g)
    ).map((m) => m[1].trim().toUpperCase());
    const darkColorDecls = Array.from(
      css.matchAll(/\.dark \.tone-[a-z]+(?:,\s*\.dark \.tone-[a-z]+)*\s*\{[^}]*(?<![\w-])color:\s*([^;]+);/g)
    ).map((m) => m[1].trim().toUpperCase());
    expect(lightColorDecls.length).toBeGreaterThan(0);
    expect(darkColorDecls.length).toBeGreaterThan(0);
    for (const c of lightColorDecls) {
      expect(c).toBe('#121212');
    }
    for (const c of darkColorDecls) {
      expect(c).toBe('#FDFBF7');
    }
  });

  it('la regola condivisa .tone-* dichiara border-width: 1px e border-color: hsl(var(--border))', () => {
    const m = css.match(
      /\.tone-info,\s*\.tone-success,\s*\.tone-warning,\s*\.tone-danger\s*\{([^}]*)\}/
    );
    expect(m).toBeTruthy();
    const block = m![1];
    expect(block).toMatch(/border-width:\s*1px/);
    expect(block).toMatch(/border-color:\s*hsl\(var\(--border\)\)/);
  });

  it('dentro .tone-* il testo .text-muted-foreground eredita il colore (color: inherit)', () => {
    expect(css).toMatch(
      /\.tone-info \.text-muted-foreground,\s*\.tone-success \.text-muted-foreground,\s*\.tone-warning \.text-muted-foreground,\s*\.tone-danger \.text-muted-foreground\s*\{[^}]*color:\s*inherit/
    );
  });
});
