/**
 * Contrasti WCAG dei token di tema (:root / .dark) e fondi .tone-on-image.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  channelsWithin,
  composite,
  contrast,
  parseCssColor,
  parseHex,
  parseRgbModern,
  type RGB,
} from './helpers/wcag';

const ROOT = join(__dirname, '../..');
const CSS_PATH = join(ROOT, 'app/globals.css');
const TW_PATH = join(ROOT, 'tailwind.config.ts');

function extractThemeBlock(css: string, scope: 'root' | 'dark'): string {
  const block =
    scope === 'root'
      ? css.match(/:root\s*\{([\s\S]*?)\n  \}/)?.[1]
      : css.match(/\.dark\s*\{([\s\S]*?)\n  \}/)?.[1];
  if (!block) throw new Error(`no ${scope} block`);
  return block;
}

function readRaw(block: string, name: string): string {
  const m = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`no --${name}`);
  return m[1].trim();
}

function readToken(block: string, name: string): RGB {
  return parseCssColor(readRaw(block, name));
}

const TEXT_PAIRS: Array<[string, string]> = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
];

const BORDER_PAIRS: Array<[string, string]> = [
  ['border', 'background'],
  ['border', 'card'],
  ['input', 'background'],
];

const TONES = ['info', 'success', 'warning', 'danger'] as const;

describe('theme token contrast (WCAG)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const tw = readFileSync(TW_PATH, 'utf8');
  const root = extractThemeBlock(css, 'root');
  const dark = extractThemeBlock(css, 'dark');

  for (const [label, block] of [
    ['light', root],
    ['dark', dark],
  ] as const) {
    it(`${label}: testo ≥4.5 sulle coppie di token`, () => {
      const failures: string[] = [];
      for (const [fgName, bgName] of TEXT_PAIRS) {
        const fg = readToken(block, fgName);
        const bg = readToken(block, bgName);
        const ratio = contrast(fg, bg);
        if (ratio < 4.5) {
          failures.push(`${fgName}/${bgName}: ${ratio.toFixed(2)}`);
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });

    it(`${label}: bordo ≥3 su background e card`, () => {
      const failures: string[] = [];
      for (const [fgName, bgName] of BORDER_PAIRS) {
        const fg = readToken(block, fgName);
        const bg = readToken(block, bgName);
        const ratio = contrast(fg, bg);
        if (ratio < 3) {
          failures.push(`${fgName}/${bgName}: ${ratio.toFixed(2)}`);
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }

  it('dark: muted distinto da card (contrasto ≥1.2)', () => {
    const muted = readToken(dark, 'muted');
    const card = readToken(dark, 'card');
    const ratio = contrast(muted, card);
    expect(ratio, `muted/card ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(1.2);
  });

  it('dark: --bg-surface uguale a --card (tolleranza 1)', () => {
    const surface = readToken(dark, 'bg-surface');
    const card = readToken(dark, 'card');
    expect(
      channelsWithin(surface, card, 1),
      `surface ${JSON.stringify(surface)} vs card ${JSON.stringify(card)}`
    ).toBe(true);
  });

  it('dark: --text-secondary ≥4.5 su --bg-surface', () => {
    const text = readToken(dark, 'text-secondary');
    const surface = readToken(dark, 'bg-surface');
    const composed = text.a < 1 ? composite(text, surface) : text;
    const ratio = contrast(composed, surface);
    expect(ratio, `text-secondary on bg-surface: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });

  it("tailwind dark-bg-surface e dark-text-secondary allineati a --bg-surface e --text-secondary", () => {
    const surfaceRaw = readRaw(dark, 'bg-surface');
    const textRaw = readRaw(dark, 'text-secondary');
    expect(tw).toMatch(
      new RegExp(`['"]dark-bg-surface['"]\\s*:\\s*['"]${escapeRe(surfaceRaw)}['"]`)
    );
    expect(tw).toMatch(
      new RegExp(`['"]dark-text-secondary['"]\\s*:\\s*['"]${escapeRe(textRaw)}['"]`)
    );
  });
});

describe('tone-on-image contrast', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const darkBlock = extractThemeBlock(css, 'dark');
  const darkCard = readToken(darkBlock, 'card');
  const lightInk = parseHex('#121212');
  const darkInk = parseHex('#FDFBF7');

  function readToneBg(selectorPrefix: string, tone: string): RGB {
    const re = new RegExp(
      `${selectorPrefix}\\.tone-${tone}\\s*\\{\\s*background-color:\\s*([^;]+);`
    );
    const m = css.match(re);
    if (!m) throw new Error(`missing ${selectorPrefix}.tone-${tone}`);
    const raw = m[1].trim();
    if (raw.startsWith('#')) return parseHex(raw);
    const rgb = parseRgbModern(raw);
    if (!rgb) throw new Error(`parse fail ${selectorPrefix}.tone-${tone}: ${raw}`);
    return rgb;
  }

  it('dark: .tone-on-image coincide con .tone-* composto sulla card (tol. 2)', () => {
    const failures: string[] = [];
    for (const tone of TONES) {
      const translucent = readToneBg('\\.dark ', tone);
      const expected = composite(translucent, darkCard);
      const onImage = readToneBg('\\.dark \\.tone-on-image', tone);
      if (!channelsWithin(onImage, expected, 2)) {
        failures.push(
          `${tone}: on-image ${JSON.stringify(onImage)} vs composed ${JSON.stringify(expected)}`
        );
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('light: .tone-on-image warning/danger pieni e testo #121212 ≥7', () => {
    const failures: string[] = [];
    for (const tone of ['warning', 'danger'] as const) {
      const bg = readToneBg('\\.tone-on-image', tone);
      if (bg.a < 1) failures.push(`light ${tone}: alpha ${bg.a} (atteso pieno)`);
      const ratio = contrast(lightInk, bg);
      if (ratio < 7) failures.push(`light ${tone} text: ${ratio.toFixed(2)}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('dark: testo #FDFBF7 ≥7 su tutti i .tone-on-image', () => {
    const failures: string[] = [];
    for (const tone of TONES) {
      const bg = readToneBg('\\.dark \\.tone-on-image', tone);
      const ratio = contrast(darkInk, bg);
      if (ratio < 7) failures.push(`dark ${tone}: ${ratio.toFixed(2)}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
