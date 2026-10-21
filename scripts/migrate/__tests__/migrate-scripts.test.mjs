import { describe, expect, it } from 'vitest';
import {
  assertPublicDataPresent,
  countTableDataBySchema,
} from '../dump-source.mjs';
import {
  composeBaselineSql,
  qualifyAuthTrigger,
  sanitizePublicSchema,
} from '../build-baseline.mjs';
import { buildRestoreSqlFile } from '../restore-dest.mjs';

describe('countTableDataBySchema', () => {
  const sample = `
;
; Archive created at 2026-10-21
;
123; 0 0 TABLE DATA public profiles postgres
124; 0 0 TABLE DATA public biographies postgres
200; 0 0 TABLE DATA auth users postgres
201; 0 0 TABLE DATA auth identities postgres
`;

  it('counts TABLE DATA per schema', () => {
    const { bySchema, tables } = countTableDataBySchema(sample);
    expect(bySchema).toEqual({ public: 2, auth: 2, other: 0 });
    expect(tables.public).toEqual(['profiles', 'biographies']);
    expect(tables.auth).toEqual(['users', 'identities']);
  });

  it('fails assertPublicDataPresent when public data missing', () => {
    expect(() =>
      assertPublicDataPresent('1; 0 0 TABLE DATA auth users postgres\n')
    ).toThrow(/missing public TABLE DATA/);
  });

  it('passes assertPublicDataPresent when public data present', () => {
    const r = assertPublicDataPresent(sample);
    expect(r.bySchema.public).toBe(2);
  });
});

describe('sanitizePublicSchema', () => {
  it('rewrites CREATE SCHEMA public and strips CREATE EXTENSION', () => {
    const raw = `
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
CREATE TABLE public.profiles (id uuid);
COMMENT ON EXTENSION vector IS 'x';
`;
    const out = sanitizePublicSchema(raw);
    expect(out).toContain('CREATE SCHEMA IF NOT EXISTS public;');
    expect(out).not.toMatch(/CREATE EXTENSION/i);
    expect(out).toContain('CREATE TABLE public.profiles');
  });
});

describe('qualifyAuthTrigger', () => {
  it('qualifies handle_new_user with public.', () => {
    const raw =
      'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()';
    expect(qualifyAuthTrigger(raw)).toContain('public.handle_new_user(');
  });
});

describe('composeBaselineSql', () => {
  it('starts with CREATE EXTENSION vector and creates schema_migrations', () => {
    const sql = composeBaselineSql({
      extensions: [
        { name: 'pgcrypto', schema: 'extensions' },
        { name: 'vector', schema: 'public' },
      ],
      publicSchema: 'CREATE SCHEMA public;\nCREATE TABLE public.t (id int);\n',
      triggerDef:
        'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()',
      buckets: [],
      policies: [],
    });
    expect(sql.split('\n')[0]).toBe(
      'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;'
    );
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;');
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS public;');
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS supabase_migrations;');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations');
    expect(sql).toContain('public.handle_new_user');
    expect(sql).toMatch(/SET search_path TO 'public'/);
  });
});

describe('buildRestoreSqlFile dry-run', () => {
  it('prints plan without writing', () => {
    const logs = [];
    const orig = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    try {
      buildRestoreSqlFile('pg_restore', '/tmp/data.dump', '/tmp/data-restore.sql', {
        dryRun: true,
      });
    } finally {
      console.log = orig;
    }
    expect(logs.some((l) => l.includes('SET session_replication_role = replica'))).toBe(true);
    expect(logs.some((l) => l.includes('psql -1'))).toBe(true);
    expect(logs.every((l) => !l.includes('--disable-triggers'))).toBe(true);
  });
});
