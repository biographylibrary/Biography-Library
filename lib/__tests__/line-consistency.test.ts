/**
 * Gate: linee e riquadri neutri usano border-border pieno (1px),
 * stessi token --border/--input, nessun colore fisso legacy per le linee.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');

const SCAN_DIRS = ['app', 'components', 'hooks'] as const;

function walkTsxAndCss(dir: string, out: string[] = []): string[] {
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
      walkTsxAndCss(full, out);
      continue;
    }
    if (/\.(tsx|ts|css)$/.test(name) && !name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

function sourceFiles(): string[] {
  return SCAN_DIRS.flatMap((d) => walkTsxAndCss(join(ROOT, d)));
}

/** Classi (border|divide)(-[trblxy])?-border/NN con eventuali prefissi di variante. */
const NEUTRAL_OPACITY =
  /(?:^|[\s"'`])((?:[\w\[\]\-./]+:)*(?:border(?:-[trblxy])?|divide)-border\/\d+)\b/g;

/**
 * border-(primary|foreground|muted|muted-foreground)/NN.
 * Amessi: variante hover:, focus:, group-hover: davanti.
 * Eccezioni esplicite (famiglia B o C lasciate volutamente):
 * - GuidedSectionWorkspace: stato «completato» border-primary/60
 * - toast: group-[.destructive]:border-muted/40 (azione su toast destructive, famiglia C)
 */
const TINTED_BORDER =
  /(?:^|[\s"'`])((?:[\w\[\]\-./]+:)*border(?:-[trblxy])?-(?:primary|foreground|muted|muted-foreground)\/\d+)\b/g;

const ALLOWED_TINTED: ReadonlyArray<{ fileSuffix: string; classFragment: string }> = [
  {
    fileSuffix: 'components/echo/GuidedSectionWorkspace.tsx',
    classFragment: 'border-primary/60',
  },
  {
    fileSuffix: 'components/ui/toast.tsx',
    classFragment: 'group-[.destructive]:border-muted/40',
  },
];

function isHoverFocusVariant(token: string): boolean {
  const variants = token.split(':').slice(0, -1);
  return variants.some((v) => v === 'hover' || v === 'focus' || v === 'group-hover');
}

describe('line consistency (neutral borders)', () => {
  it('nessuna classe (border|divide)-border/NN in app, components, hooks', () => {
    const hits: string[] = [];
    for (const file of sourceFiles()) {
      const text = readFileSync(file, 'utf8');
      for (const m of Array.from(text.matchAll(NEUTRAL_OPACITY))) {
        hits.push(`${relative(ROOT, file)}: ${m[1]}`);
      }
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('border-primary|foreground|muted(-foreground)/NN solo con hover/focus o eccezioni commentate', () => {
    const hits: string[] = [];
    for (const file of sourceFiles()) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      const text = readFileSync(file, 'utf8');
      for (const m of Array.from(text.matchAll(TINTED_BORDER))) {
        const token = m[1]!;
        if (isHoverFocusVariant(token)) continue;
        const ok = ALLOWED_TINTED.some(
          (a) => rel.endsWith(a.fileSuffix) && token.includes(a.classFragment)
        );
        if (!ok) hits.push(`${rel}: ${token}`);
      }
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('--border e --input uguali in :root e .dark; --border-global è hsl(var(--border))', () => {
    const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
    const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n  \}/)?.[1] ?? '';
    const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\n  \}/)?.[1] ?? '';
    const rootBorder = rootBlock.match(/--border:\s*([^;]+);/)?.[1]?.trim();
    const rootInput = rootBlock.match(/--input:\s*([^;]+);/)?.[1]?.trim();
    const darkBorder = darkBlock.match(/--border:\s*([^;]+);/)?.[1]?.trim();
    const darkInput = darkBlock.match(/--input:\s*([^;]+);/)?.[1]?.trim();
    expect(rootBorder).toBeTruthy();
    expect(rootInput).toBe(rootBorder);
    expect(darkBorder).toBeTruthy();
    expect(darkInput).toBe(darkBorder);
    expect(rootBorder).toBe('0 0% 30%');
    expect(darkBorder).toBe('40 6% 52%');
    expect(rootBlock).toMatch(/--border-global:\s*hsl\(var\(--border\)\);/);
    expect(rootBlock).not.toMatch(/--border-global:\s*#[0-9A-Fa-f]{3,8}/);
  });

  it('tailwind.config.ts non definisce colori fissi per le linee oltre a border/input via variabili', () => {
    const cfg = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8');
    expect(cfg).toMatch(/border:\s*'hsl\(var\(--border\)\)'/);
    expect(cfg).toMatch(/input:\s*'hsl\(var\(--input\)\)'/);
    expect(cfg).not.toMatch(/['"]border-global['"]\s*:/);
    expect(cfg).not.toMatch(/border-global['"]?\s*:\s*['"]#[0-9A-Fa-f]+['"]/);
  });
});
