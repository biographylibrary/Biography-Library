import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BIOGRAPHIES_AUTHOR_TEXT_COLUMNS } from '@/lib/publication-state';
import { PUBLICATION_FINGERPRINT_BIOGRAPHY_COLUMNS } from '@/lib/server/publication-fingerprint';

const WHITELIST_SQL = join(
  process.cwd(),
  'supabase/migrations/20260930120150_author_text_whitelist.sql'
);

function columnsFromSqlFunction(src: string, fnName: string): string[] {
  const re = new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${fnName}\\(\\)[\\s\\S]*?SELECT ARRAY\\[([\\s\\S]*?)\\]::text\\[\\]`,
    'i'
  );
  const match = re.exec(src);
  if (!match) throw new Error(`function ${fnName} not found in whitelist migration`);
  return match[1]
    .split(',')
    .map((part) => part.replace(/'/g, '').trim())
    .filter(Boolean);
}

describe('author text columns stay aligned', () => {
  it('TypeScript whitelist matches SQL biographies_author_text_columns()', () => {
    const sql = readFileSync(WHITELIST_SQL, 'utf8');
    const fromSql = columnsFromSqlFunction(sql, 'biographies_author_text_columns');
    expect([...fromSql].sort()).toEqual([...BIOGRAPHIES_AUTHOR_TEXT_COLUMNS].sort());
  });

  it('publication fingerprint reads every author-text column', () => {
    const fingerprintCols = new Set(PUBLICATION_FINGERPRINT_BIOGRAPHY_COLUMNS);
    for (const col of BIOGRAPHIES_AUTHOR_TEXT_COLUMNS) {
      expect(fingerprintCols.has(col as (typeof PUBLICATION_FINGERPRINT_BIOGRAPHY_COLUMNS)[number])).toBe(
        true
      );
    }
  });

  it('server canAuthorWriteText statuses match SQL author_text_writable_statuses()', async () => {
    const { AUTHOR_TEXT_WRITABLE_STATUSES } = await import('@/lib/publication-state');
    const sql = readFileSync(WHITELIST_SQL, 'utf8');
    const fromSql = columnsFromSqlFunction(sql, 'author_text_writable_statuses');
    expect([...fromSql].sort()).toEqual([...AUTHOR_TEXT_WRITABLE_STATUSES].sort());
  });
});
