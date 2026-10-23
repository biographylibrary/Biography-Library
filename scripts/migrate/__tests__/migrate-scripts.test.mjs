import { describe, expect, it } from 'vitest';
import {
  assertPublicDataPresent,
  buildRowCountsSql,
  countTableDataBySchema,
  sqlJsonLiteral,
  sqlStringLiteral,
} from '../dump-source.mjs';
import { AUTH_EXCLUDED_TABLES } from '../lib-db.mjs';
import {
  assertDumpHasHandleNewUser,
  composeBaselineSql,
  countHandleNewUserDefinitions,
  qualifyAuthTrigger,
  sanitizePublicSchema,
} from '../build-baseline.mjs';
import { buildRestoreSqlFile } from '../restore-dest.mjs';
import { buildResetDestSql } from '../reset-dest.mjs';
import {
  CATALOG_SQL,
  CONTENT_CHECKSUM_SQL,
  catalogSqlHasStableFnHashOrder,
  contentChecksumSqlHasOrderedAggregates,
} from '../verify-counts.mjs';
import {
  IRELAND_HOST,
  URL_COLUMNS,
  ZURICH_HOST,
  assertNoHostRemaining,
  buildRewriteSql,
  hostPair,
} from '../rewrite-storage-urls.mjs';

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

describe('buildRowCountsSql JSON literals', () => {
  it('embeds dumped/excluded auth tables as quoted ::json literals', () => {
    const dumped = ['auth.users', 'auth.identities'];
    const sql = buildRowCountsSql(dumped, AUTH_EXCLUDED_TABLES);
    expect(sql).toContain(`'dumped_auth_tables', ${sqlJsonLiteral(dumped)}`);
    expect(sql).toContain(`'excluded_auth_tables', ${sqlJsonLiteral(AUTH_EXCLUDED_TABLES)}`);
    expect(sql).toMatch(/'dumped_auth_tables',\s*'\[.*\]'::json/);
    expect(sql).toMatch(/'excluded_auth_tables',\s*'\[.*\]'::json/);
    // Must not inject bare JSON arrays (the bug that broke psql)
    expect(sql).not.toMatch(/'dumped_auth_tables',\s*\[/);
  });

  it('doubles single quotes inside sqlStringLiteral', () => {
    expect(sqlStringLiteral("a'b")).toBe("'a''b'");
    expect(sqlJsonLiteral(["o'k"])).toBe(`'["o''k"]'::json`);
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

  it('strips ALTER DEFAULT PRIVILEGES (postgres cannot change supabase_admin defaults)', () => {
    const raw = `
CREATE TABLE public.profiles (id uuid);
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
GRANT SELECT ON public.profiles TO anon;
`;
    const out = sanitizePublicSchema(raw);
    expect(out).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES/i);
    expect(out).toContain('CREATE TABLE public.profiles');
    expect(out).toContain('GRANT SELECT ON public.profiles TO anon;');
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
  const dumpWithFn = `
CREATE SCHEMA public;
CREATE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;
CREATE TABLE public.t (id int);
`;

  it('starts with CREATE EXTENSION vector and creates schema_migrations', () => {
    const sql = composeBaselineSql({
      extensions: [
        { name: 'pgcrypto', schema: 'extensions' },
        { name: 'vector', schema: 'public' },
      ],
      publicSchema: dumpWithFn,
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
    expect(sql).toContain('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
    expect(sql).toContain('EXECUTE FUNCTION public.handle_new_user(');
    expect(sql).toMatch(/SET search_path TO ''/);
    expect(sql).not.toMatch(/SET search_path TO 'public'/);
  });

  it('keeps exactly one handle_new_user definition from the dump (no hand-written copy)', () => {
    const sql = composeBaselineSql({
      extensions: [{ name: 'vector', schema: 'public' }],
      publicSchema: dumpWithFn,
      triggerDef:
        'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
      buckets: [],
      policies: [],
    });
    expect(countHandleNewUserDefinitions(sql)).toBe(1);
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.handle_new_user/i);
  });

  it('fails when dump lacks handle_new_user', () => {
    expect(() =>
      composeBaselineSql({
        extensions: [{ name: 'vector', schema: 'public' }],
        publicSchema: 'CREATE TABLE public.t (id int);\n',
        triggerDef:
          'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
        buckets: [],
        policies: [],
      })
    ).toThrow(/missing CREATE FUNCTION public\.handle_new_user/);
    expect(() => assertDumpHasHandleNewUser('CREATE TABLE x(i int);')).toThrow(
      /missing CREATE FUNCTION/
    );
  });
});

describe('verify-counts catalog / content SQL stability', () => {
  it('orders fn_hash by proname and identity arguments', () => {
    expect(catalogSqlHasStableFnHashOrder(CATALOG_SQL)).toBe(true);
    expect(CATALOG_SQL).toMatch(
      /order by p\.proname,\s*pg_get_function_identity_arguments\(p\.oid\)/i
    );
    // Must not order by name alone (unstable for overloads)
    expect(CATALOG_SQL).not.toMatch(
      /string_agg\(md5\(pg_get_functiondef\(p\.oid\)\), ',' order by p\.proname\)/i
    );
    expect(CATALOG_SQL).toMatch(
      /policy_hash[\s\S]*order by schemaname, tablename, policyname/i
    );
  });

  it('orders every content string_agg (and json_object_agg) stably', () => {
    expect(contentChecksumSqlHasOrderedAggregates(CONTENT_CHECKSUM_SQL)).toBe(true);
  });
});

describe('rewrite-storage-urls', () => {
  it('builds ireland→zurich replace SQL for all tracked columns', () => {
    const sql = buildRewriteSql({ reverse: false });
    expect(sql).toMatch(/^BEGIN;/);
    expect(sql).toMatch(/COMMIT;/);
    expect(hostPair().fromHost).toBe(IRELAND_HOST);
    expect(hostPair().toHost).toBe(ZURICH_HOST);
    for (const { table, column } of URL_COLUMNS) {
      expect(sql).toContain(`UPDATE public.${table}`);
      expect(sql).toContain(
        `replace(${column}, '${IRELAND_HOST}', '${ZURICH_HOST}')`
      );
    }
  });

  it('supports --reverse and fails if forbidden host remains', () => {
    const sql = buildRewriteSql({ reverse: true });
    expect(sql).toContain(`replace(file_url, '${ZURICH_HOST}', '${IRELAND_HOST}')`);
    expect(() =>
      assertNoHostRemaining({ 'media.file_url': 2 }, IRELAND_HOST, 'test')
    ).toThrow(/still contain/);
    expect(() => assertNoHostRemaining({ 'media.file_url': 0 }, IRELAND_HOST, 'test')).not.toThrow();
  });
});

describe('buildResetDestSql', () => {
  it('includes public recreate, auth truncate, storage cleanup, vector drop', () => {
    const sql = buildResetDestSql();
    expect(sql).toMatch(/DROP SCHEMA IF EXISTS public CASCADE/i);
    expect(sql).toMatch(/CREATE SCHEMA public/i);
    expect(sql).toMatch(/GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role/i);
    expect(sql).toMatch(/TRUNCATE TABLE auth\.users CASCADE/i);
    expect(sql).toMatch(/DROP EXTENSION IF EXISTS vector CASCADE/i);
    expect(sql).toContain('biography-photos');
    expect(sql).toContain('TRUNCATE TABLE supabase_migrations.schema_migrations');
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
