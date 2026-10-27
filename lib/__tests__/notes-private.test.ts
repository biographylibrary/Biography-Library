import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Note e promemoria sono un blocco privato dell'autore: la guida dice «non esportato». Qui si blocca
 * che il codice di esportazione, di stampa, di deposito e di lettura pubblica non le legga mai, e
 * che le tabelle siano leggibili solo dal proprietario della biografia (mai da anon).
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const OUTPUT_FILES = [
  'lib/export-utils.ts',
  'lib/export-server.ts',
  'lib/pdf-export.ts',
  'lib/permanence-text-export.ts',
  'lib/archive-package.ts',
  'lib/server/permanence-stored-exports.ts',
  'lib/public-biography-selects.ts',
  'lib/book-parts.ts',
];

describe('note e promemoria restano privati', () => {
  for (const file of OUTPUT_FILES) {
    it(`${file} non legge le tabelle delle note`, () => {
      expect(read(file)).not.toMatch(/section_notes|section_todos/);
    });
  }

  it('nessuna rotta pubblica o d\'esportazione legge le note', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name !== '__tests__' && name !== 'node_modules') walk(path);
        } else if (/\.(ts|tsx)$/.test(name) && /section_notes|section_todos/.test(readFileSync(path, 'utf8'))) {
          offenders.push(path.replace(`${ROOT}/`, ''));
        }
      }
    };
    walk(join(ROOT, 'app'));
    walk(join(ROOT, 'lib'));
    // Solo il pannello dell'autore (componenti) e la cancellazione dei dati possono toccarle.
    expect(offenders.filter((f) => /export|public|archive|pdf|catalog|reader/i.test(f))).toEqual([]);
  });

  it('le regole di accesso alle due tabelle sono solo per il proprietario, mai per anon', () => {
    const dir = join(ROOT, 'supabase/migrations');
    for (const table of ['section_notes', 'section_todos']) {
      const policies: string[] = [];
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
        const sql = readFileSync(join(dir, file), 'utf8');
        for (const m of Array.from(sql.matchAll(new RegExp(`CREATE POLICY[^;]*ON public\\.${table}[^;]*;`, 'gi')))) {
          policies.push(m[0]);
        }
      }
      expect(policies.length).toBeGreaterThan(0);
      for (const policy of policies) {
        expect(policy).not.toMatch(/TO\s+(anon|public)\b/i);
        expect(policy).not.toMatch(/USING\s*\(\s*true\s*\)/i);
        expect(policy).toMatch(/auth\.uid\(\)/);
      }
    }
  });
});
