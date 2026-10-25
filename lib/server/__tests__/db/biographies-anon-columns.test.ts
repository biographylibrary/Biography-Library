import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PUBLIC_VIEW_SELECT } from '@/lib/biography-view-select';
import {
  PUBLIC_BIOGRAPHY_FILTER_COLUMNS,
  PUBLIC_EDITIONS_SELECT,
  PUBLISHED_SELECT,
} from '@/lib/public-biography-selects';
import { EDITION_VIEW_METADATA_SELECT } from '@/lib/edition-view-metadata';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

const MIGRATION = '20261025120000_biographies_anon_column_grants.sql';
const migrationSql = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', MIGRATION),
  'utf8'
);

/** Colonne nel GRANT SELECT (…) TO anon della migrazione. */
export function parseAnonBiographyGrantColumns(sql: string): string[] {
  const match = sql.match(
    /GRANT\s+SELECT\s*\(([\s\S]*?)\)\s+ON\s+TABLE\s+public\.biographies\s+TO\s+anon\s*;/i
  );
  if (!match) {
    throw new Error('GRANT SELECT (columns) ON public.biographies TO anon not found');
  }
  return match[1]
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

function splitSelectColumns(select: string): string[] {
  return select
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(migrationSql);
}, 60_000);

afterAll(async () => {
  await db.close();
});

const PUBLIC_LICENSE = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

beforeEach(async () => {
  await reseed(db);
  // service_role: bypass trigger licenza; settiamo comunque rights per coerenza.
  await as(
    db,
    'service_role',
    null,
    `update biographies set
       visibility = 'public',
       rights_statement_uri = $2,
       rights_chosen_at = now(),
       rights_holder = 'Test'
     where id = $1`,
    [BIO.published, PUBLIC_LICENSE]
  );
});

const asAnon = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'anon', null, sql, params);
const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);

function isPermissionDenied(message: string | null): boolean {
  if (!message) return false;
  return (
    message.includes('42501') ||
    /permission denied for (column|table|relation|view)/i.test(message)
  );
}

describe('20261025120000 biographies anon column grants', () => {
  it('anon non legge user_id, share_token, ai_screening_status (42501)', async () => {
    for (const col of ['user_id', 'share_token', 'ai_screening_status'] as const) {
      const err = await errorOf(() =>
        asAnon(`select ${col} from biographies where id = $1`, [BIO.published])
      );
      expect(isPermissionDenied(err), `${col}: ${err}`).toBe(true);
    }
  });

  it('anon legge le colonne pubbliche su una biografia published+public', async () => {
    const rows = await asAnon<{ id: string; title: string; status: string; visibility: string }>(
      `select id, title, status, visibility, author_name, slug, record_language_tag, final_pdf_url
       from biographies where id = $1`,
      [BIO.published]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(BIO.published);
    expect(rows[0].status).toBe('published');
    expect(rows[0].visibility).toBe('public');
  });

  it('anon non vede una biografia privata (RLS; zero righe)', async () => {
    await asService(`update biographies set visibility = 'private' where id = $1`, [BIO.published]);
    const rows = await asAnon(`select id from biographies where id = $1`, [BIO.published]);
    expect(rows).toEqual([]);
  });

  it('anon SELECT * fallisce (atteso: column privileges)', async () => {
    const err = await errorOf(() => asAnon(`select * from biographies where id = $1`, [BIO.published]));
    expect(isPermissionDenied(err), String(err)).toBe(true);
  });

  it('authenticated e service_role non perdono SELECT sulla tabella', async () => {
    const authRows = await as<{ id: string }>(
      db,
      'authenticated',
      U.author,
      `select id, user_id, share_token from biographies where id = $1`,
      [BIO.published]
    );
    expect(authRows).toHaveLength(1);
    expect(authRows[0]).toHaveProperty('user_id');

    const svc = await asService<{ share_token: string | null }>(
      `select share_token from biographies where id = $1`,
      [BIO.published]
    );
    expect(svc).toHaveLength(1);
  });

  it('policy anonime figlie via biography_public_read_allowed restano usabili', async () => {
    const allowed = await asAnon<{ ok: boolean }>(
      `select public.biography_public_read_allowed($1) as ok`,
      [BIO.published]
    );
    expect(allowed[0]?.ok).toBe(true);

    // person_events / person_relations: SELECT anon con helper DEFINER (niente colonne extra).
    await asService(
      `insert into person_events (biography_id, event_type) values ($1, 'birth')`,
      [BIO.published]
    );
    const events = await asAnon<{ event_type: string }>(
      `select event_type from person_events where biography_id = $1`,
      [BIO.published]
    );
    expect(events.map((e) => e.event_type)).toContain('birth');

    await asService(
      `insert into person_relations (biography_id, relation_code) values ($1, 'parent')`,
      [BIO.published]
    );
    const rels = await asAnon<{ relation_code: string }>(
      `select relation_code from person_relations where biography_id = $1`,
      [BIO.published]
    );
    expect(rels.map((r) => r.relation_code)).toContain('parent');
  });

  it('biography_flat non è più SELECT per anon', async () => {
    const err = await errorOf(() =>
      asAnon(`select id from biography_flat where id = $1`, [BIO.published])
    );
    // REVOKE ALL: permission denied on the view/table, or empty if somehow RLS-only.
    if (err) {
      expect(isPermissionDenied(err), String(err)).toBe(true);
    } else {
      const rows = await asAnon(`select id from biography_flat where id = $1`, [BIO.published]);
      expect(rows).toEqual([]);
    }
  });
});

describe('coverage: select/filtri pubblici ⊆ GRANT migrazione', () => {
  it('ogni colonna delle costanti pubbliche è nel GRANT anon', () => {
    const granted = new Set(parseAnonBiographyGrantColumns(migrationSql));
    const needed = new Set<string>([
      ...splitSelectColumns(PUBLISHED_SELECT),
      ...splitSelectColumns(PUBLIC_EDITIONS_SELECT),
      ...splitSelectColumns(PUBLIC_VIEW_SELECT),
      ...splitSelectColumns(EDITION_VIEW_METADATA_SELECT),
      ...PUBLIC_BIOGRAPHY_FILTER_COLUMNS,
    ]);
    const missing = Array.from(needed)
      .filter((c) => !granted.has(c))
      .sort();
    expect(missing, `colonne usate in pubblico ma non in GRANT: ${missing.join(', ')}`).toEqual(
      []
    );
  });

  it('PUBLIC_VIEW_SELECT non include share_token', () => {
    expect(splitSelectColumns(PUBLIC_VIEW_SELECT)).not.toContain('share_token');
  });
});
