import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ogni punto del server che porta una scheda a `published` passa da
 * gatedPublish (confronto dell'impronta del testo e traccia nel registro).
 * Questo test impedisce che un percorso nuovo nasca senza: se aggiungi una
 * scrittura `status: 'published'` lato server, o la fai passare da gatedPublish
 * o la aggiungi qui di proposito, spiegando perché.
 */
const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name === '.next') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

const SERVER_FILES = [...walk(join(ROOT, 'app', 'api')), ...walk(join(ROOT, 'lib', 'server'))].map((f) =>
  relative(ROOT, f)
);

/** I quattro percorsi che pubblicano dal server. */
const GATED_PATHS = [
  'lib/server/review-submit-pipeline.ts',
  'lib/server/admin-biography-actions.ts',
  'lib/server/moderation-decide-pipeline.ts',
  'app/api/admin/moderation/appeal/route.ts',
];

describe('percorsi di pubblicazione dal server', () => {
  it.each(GATED_PATHS)('%s usa gatedPublish', (file) => {
    expect(readFileSync(join(ROOT, file), 'utf8')).toContain('gatedPublish(');
  });

  it('nessun altro file del server scrive status: \'published\'', () => {
    const writers = SERVER_FILES.filter((file) => {
      if (file === 'lib/server/publication-fingerprint.ts') return false;
      const text = readFileSync(join(ROOT, file), 'utf8');
      return /status:\s*'published'/.test(text);
    });
    for (const file of writers) {
      expect(GATED_PATHS, `${file} scrive status: 'published' senza passare da gatedPublish`).toContain(file);
    }
  });
});
