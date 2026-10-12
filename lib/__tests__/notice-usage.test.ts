/**
 * Uso corretto di notice-bar / tone-* (niente bordi colorati o border-b sulle barre).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');

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

const ALLOWED_TONE_BORDER: ReadonlyArray<{ file: string; reason: string }> = [];

/** Classe border-b/t/x/y/l/r (anche con numero), non border-border. */
const SIDE_BORDER = /(?:^|[\s"'`])border-(?:[btlrx]|[btlrx]-\d+)(?=[\s"'`]|$)/;
const TONE = /(?:^|[\s"'`])tone-(?:info|success|warning|danger)(?=[\s"'`]|$)/;
const BORDER_BRAND = /(?:^|[\s"'`])border-brand-/;

describe('notice-bar e uso di tone-*', () => {
  it('.notice-bar dichiara border-width: 0 0 1px dopo la regola condivisa .tone-*', () => {
    const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
    const sharedIdx = css.search(
      /\.tone-info,\s*\.tone-success,\s*\.tone-warning,\s*\.tone-danger\s*\{/
    );
    expect(sharedIdx).toBeGreaterThanOrEqual(0);
    const barIdx = css.search(/\.notice-bar\s*\{/);
    expect(barIdx).toBeGreaterThan(sharedIdx);
    const barBlock = css.slice(barIdx).match(/\.notice-bar\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(barBlock).toMatch(/border-width:\s*0\s+0\s+1px/);
  });

  it('nessuna riga .tsx con tone-* insieme a border-[btlrx] o border-brand-', () => {
    const hits: string[] = [];
    for (const dir of ['app', 'components']) {
      for (const file of walkTsx(join(ROOT, dir))) {
        const rel = relative(ROOT, file).replace(/\\/g, '/');
        const text = readFileSync(file, 'utf8');
        text.split(/\n/).forEach((line, idx) => {
          if (!TONE.test(line)) return;
          const hasSide = SIDE_BORDER.test(line);
          const hasBrand = BORDER_BRAND.test(line);
          if (!hasSide && !hasBrand) return;
          const allowed = ALLOWED_TONE_BORDER.some((a) => a.file === rel);
          if (!allowed) {
            hits.push(`${rel}:${idx + 1} ${line.trim().slice(0, 120)}`);
          }
        });
      }
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('nessun text-brand chiaro (blue/greenLight/mustard*) senza prefisso dark:', () => {
    // Classi vietate su fondo chiaro senza dark: (regola 4).
    const LIGHT_TEXT =
      /(?:^|[\s"'`])((?:[\w\[\]=\-.%/]+:)*text-(?:brand-(?:blue|greenLight|mustardLight|mustardDark)|\[#[Cc]4[Dd][Aa][Ee][Bb]\]|\[#[Cc]8[Dd][Ff][Bb][Ee]\]|\[#[Ee][Dd][Ee]4[Bb]9\]|\[#[Dd][Dd][Cc][Ff]88\]))(?=[\s"'`]|$)/g;
    const hits: string[] = [];
    for (const dir of ['app', 'components']) {
      for (const file of walkTsx(join(ROOT, dir))) {
        const rel = relative(ROOT, file).replace(/\\/g, '/');
        readFileSync(file, 'utf8')
          .split(/\n/)
          .forEach((line, idx) => {
            for (const m of Array.from(line.matchAll(LIGHT_TEXT))) {
              const token = m[1]!;
              const variants = token.split(':').slice(0, -1);
              if (variants.includes('dark')) continue;
              hits.push(`${rel}:${idx + 1} ${token}`);
            }
          });
      }
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });
});
