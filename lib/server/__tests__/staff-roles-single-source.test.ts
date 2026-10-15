/**
 * Guarda che i ruoli staff non vengano ridefiniti con un letterale altrove:
 * l'unica fonte è lib/server/staff-roles.ts.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLATFORM_STAFF_ROLES, STAFF_ROLES } from '@/lib/server/staff-roles';

const ROOT = join(__dirname, '../../..');
const ALLOWED = new Set(['lib/server/staff-roles.ts']);

const LITERAL =
  /(?:new\s+Set\s*\(\s*)?\[\s*['"]reviewer['"]\s*,\s*['"]admin['"]\s*,\s*['"]super_admin['"]\s*\]/;

function walkSources(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (
      name === 'node_modules' ||
      name === '.next' ||
      name === '__tests__' ||
      name === 'coverage' ||
      name === 'dist'
    ) {
      continue;
    }
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkSources(full, out);
      continue;
    }
    if (name.endsWith('.test.ts') || name.endsWith('.test.tsx')) continue;
    if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.mjs')) {
      out.push(full);
    }
  }
  return out;
}

describe('staff roles single source', () => {
  it('PLATFORM_STAFF_ROLES matches the canonical set', () => {
    expect([...PLATFORM_STAFF_ROLES]).toEqual(['reviewer', 'admin', 'super_admin']);
    expect(STAFF_ROLES).toEqual(new Set(PLATFORM_STAFF_ROLES));
  });

  it('no second literal staff-role list outside staff-roles.ts', () => {
    const hits: string[] = [];
    for (const dir of ['app', 'lib', 'components', 'hooks', 'scripts']) {
      for (const file of walkSources(join(ROOT, dir))) {
        const rel = relative(ROOT, file).replace(/\\/g, '/');
        if (ALLOWED.has(rel)) continue;
        const text = readFileSync(file, 'utf8');
        text.split(/\n/).forEach((line, idx) => {
          if (LITERAL.test(line)) {
            hits.push(`${rel}:${idx + 1} ${line.trim().slice(0, 120)}`);
          }
        });
      }
    }
    const middleware = join(ROOT, 'middleware.ts');
    const mwText = readFileSync(middleware, 'utf8');
    mwText.split(/\n/).forEach((line, idx) => {
      if (LITERAL.test(line)) {
        hits.push(`middleware.ts:${idx + 1} ${line.trim().slice(0, 120)}`);
      }
    });

    expect(hits, hits.join('\n')).toEqual([]);
  });
});
