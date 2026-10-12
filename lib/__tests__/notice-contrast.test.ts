/**
 * Contrasti WCAG dei blocchi .tone-* in app/globals.css.
 * Formula WCAG 2.x relative luminance / contrast ratio.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const CSS_PATH = join(ROOT, 'app/globals.css');

type RGB = { r: number; g: number; b: number; a: number };

function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: 1,
  };
}

/** rgb(r g b / a) modern syntax */
function parseRgbModern(s: string): RGB | null {
  const m = s.match(
    /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)/
  );
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const S = s / 100;
  const L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [C, X, 0];
  else if (h < 120) [r, g, b] = [X, C, 0];
  else if (h < 180) [r, g, b] = [0, C, X];
  else if (h < 240) [r, g, b] = [0, X, C];
  else if (h < 300) [r, g, b] = [X, 0, C];
  else [r, g, b] = [C, 0, X];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: 1,
  };
}

function parseHslTriplet(triplet: string): RGB {
  const parts = triplet.trim().split(/\s+/);
  const h = Number(parts[0]);
  const s = Number(parts[1].replace('%', ''));
  const l = Number(parts[2].replace('%', ''));
  return hslToRgb(h, s, l);
}

function composite(fg: RGB, bg: RGB): RGB {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(c: RGB): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

function contrast(a: RGB, b: RGB): number {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractToneBlocks(css: string): {
  light: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }>;
  dark: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }>;
} {
  const light: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }> = {};
  const dark: Record<string, { bg: RGB; color: RGB; borderFrom: 'var' }> = {};

  // Shared color for light tones
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

  // Verify shared color declarations exist
  if (!/\.tone-info,\s*\.tone-success,\s*\.tone-warning,\s*\.tone-danger\s*\{[\s\S]*?color:\s*#121212/.test(css)) {
    throw new Error('light tone text color missing or not #121212');
  }
  if (!/\.dark \.tone-info,\s*\.dark \.tone-success,\s*\.dark \.tone-warning,\s*\.dark \.tone-danger\s*\{[\s\S]*?color:\s*#FDFBF7/.test(css)) {
    throw new Error('dark tone text color missing or not #FDFBF7');
  }

  return { light, dark };
}

function extractBorder(css: string, scope: 'root' | 'dark'): RGB {
  const block =
    scope === 'root'
      ? css.match(/:root\s*\{([\s\S]*?)\n  \}/)?.[1]
      : css.match(/\.dark\s*\{([\s\S]*?)\n  \}/)?.[1];
  if (!block) throw new Error(`no ${scope} block`);
  const border = block.match(/--border:\s*([^;]+);/)?.[1]?.trim();
  if (!border) throw new Error(`no --border in ${scope}`);
  return parseHslTriplet(border);
}

const LIGHT_BASES = {
  page: parseHex('#EDEBE7'),
  card: parseHex('#FDFBF7'),
} as const;

const DARK_BASES = {
  page: parseHex('#1F2121'),
  card: parseHex('#666666'),
} as const;

describe('notice tone contrast (WCAG)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const tones = extractToneBlocks(css);
  const borderLight = extractBorder(css, 'root');
  const borderDark = extractBorder(css, 'dark');

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
