#!/usr/bin/env node
/**
 * Costruisce lo script della PROVA A SECCO delle migrazioni del blocco 1.
 *
 * Un solo blocco DO che applica le migrazioni nell'ordine di rilascio, confronta il
 * catalogo prima e dopo, prova come `authenticated` (e `service_role`) le scritture
 * vietate e permesse su schede esistenti, e termina SEMPRE con un'eccezione il cui
 * testo è il resoconto in JSON: l'eccezione annulla tutto (DDL compreso), nessuna
 * modifica resta. Nessun INSERT, quindi nessuna sequenza consumata.
 *
 * Uso:  node scripts/build-dry-run.mjs > dry-run.sql
 * Il banco di prova lo esegue su un database locale
 * (lib/server/__tests__/db/dry-run.test.ts); la prova in produzione si fa solo dopo la
 * conferma dell'utente, con lo stesso testo.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

/** Ordine di rilascio: prima del deploy (aggiungono), poi dopo il deploy (restringono o cancellano). */
export const RELEASE_ORDER = [
  { file: '20260930115700_publication_records.sql', when: 'prima del deploy' },
  { file: '20260930115800_ai_token_usage.sql', when: 'prima del deploy' },
  { file: '20260930115900_align_biographies_profiles_triggers.sql', when: 'dopo il deploy' },
  { file: '20260930120000_server_only_columns_and_reports.sql', when: 'dopo il deploy' },
  { file: '20260930120100_drop_biography_view_translations.sql', when: 'dopo il deploy' },
  { file: '20260930120150_author_text_whitelist.sql', when: 'dopo il deploy' },
  { file: '20260930120200_agent_threads_echo_only.sql', when: 'dopo il deploy' },
];

/**
 * Toglie solo il commento di testa del file (il blocco iniziale). Niente altro:
 * i commenti dentro i corpi delle funzioni fanno parte del loro testo, e togliendoli
 * la prova a secco non applicherebbe la migrazione vera.
 */
function compact(sql) {
  return sql.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '').trim();
}

const CATALOG_SQL = `
select jsonb_build_object(
  'triggers', (select coalesce(jsonb_agg(c.relname || '.' || t.tgname || '#' || md5(pg_get_triggerdef(t.oid)) order by c.relname, t.tgname), '[]'::jsonb)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal),
  'policies', (select coalesce(jsonb_agg(tablename || '|' || policyname || '|' || cmd || '|' || roles::text || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '') order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'),
  'functions', (select coalesce(jsonb_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')#' || md5(p.prosrc || coalesce(p.proconfig::text, '') || p.prosecdef::text || coalesce(p.proacl::text, '')) order by p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'tables', (select coalesce(jsonb_agg(c.relname || '|rls=' || c.relrowsecurity || '|force=' || c.relforcerowsecurity order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
  'constraints', (select coalesce(jsonb_agg(cl.relname || '|' || co.conname || '|' || pg_get_constraintdef(co.oid) order by cl.relname, co.conname), '[]'::jsonb)
    from pg_constraint co join pg_class cl on cl.oid = co.conrelid join pg_namespace n on n.oid = cl.relnamespace where n.nspname = 'public'),
  'indexes', (select coalesce(jsonb_agg(tablename || '|' || indexname order by tablename, indexname), '[]'::jsonb)
    from pg_indexes where schemaname = 'public'),
  'privileges', (select coalesce(jsonb_agg(grantee || '|' || table_name || '|' || privilege_type order by grantee, table_name, privilege_type), '[]'::jsonb)
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC'))
)`;

/**
 * Il blocco di prove, eseguito come DO annidato (per poterne verificare il testo con un
 * controllo md5): sceglie una bozza e una pubblicata esistenti, prova le scritture e
 * lascia il resoconto in un parametro locale della transazione.
 */
const TESTS_SQL = String.raw`DO $t$
DECLARE
  results jsonb := '[]'::jsonb;
  d_id uuid; d_owner uuid; p_id uuid; p_owner uuid; other_user uuid;
  st text; r text; expected text; cnt bigint; tbl text; col text; owner_id uuid; bio_id uuid; label text;
  writable constant text[] := ARRAY['draft','sections_complete','final_version','pdf_draft','revision_requested'];
BEGIN
  -- Schede di prova: una bozza e una pubblicata esistenti, con più righe figlie possibile.
  SELECT b.id, b.user_id INTO d_id, d_owner FROM public.biographies b WHERE b.status = 'draft'
    ORDER BY (SELECT count(*) FROM public.biography_media m WHERE m.biography_id = b.id)
           + (SELECT count(*) FROM public.biography_sections s WHERE s.biography_id = b.id)
           + (SELECT count(*) FROM public.biography_book_structure s WHERE s.biography_id = b.id) DESC, b.created_at LIMIT 1;
  SELECT b.id, b.user_id INTO p_id, p_owner FROM public.biographies b WHERE b.status = 'published'
    ORDER BY (SELECT count(*) FROM public.biography_media m WHERE m.biography_id = b.id) DESC, b.created_at LIMIT 1;
  SELECT pr.id INTO other_user FROM public.profiles pr
    WHERE pr.id NOT IN (coalesce(d_owner, pr.id), coalesce(p_owner, pr.id)) AND pr.account_status = 'active' AND pr.role = 'user' LIMIT 1;

  EXECUTE $f$
    CREATE FUNCTION pg_temp.dry_try(p_role text, p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $body$
    DECLARE n bigint;
    BEGIN
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
        EXECUTE format('set local role %I', p_role);
        EXECUTE p_sql;
        GET DIAGNOSTICS n = ROW_COUNT;
        EXECUTE 'reset role';
        RETURN 'ok rows=' || n;
      EXCEPTION WHEN OTHERS THEN
        RETURN 'errore ' || SQLSTATE || ': ' || SQLERRM;
      END;
    END;
    $body$
  $f$;
  EXECUTE $f$
    CREATE FUNCTION pg_temp.dry_check(p_name text, p_expected text, p_got text) RETURNS jsonb LANGUAGE sql AS $body$
      SELECT jsonb_build_object('prova', p_name, 'atteso', p_expected, 'ottenuto', p_got, 'ok', p_got LIKE p_expected)
    $body$
  $f$;

  IF d_id IS NULL OR p_id IS NULL THEN
    results := results || jsonb_build_object('prova', 'schede di prova', 'atteso', 'una bozza e una pubblicata', 'ottenuto', 'mancano', 'ok', false);
  ELSE
    -- 1) Il testo per stato: ogni valore del vincolo CHECK, sulla bozza portata a quello stato dallo script (annullato).
    FOREACH st IN ARRAY ARRAY['draft','sections_complete','final_version','pdf_draft','revision_requested','locked_pending_screening','under_review','revision_pending_review','revision_overdue','suspended_pending_verification','removed'] LOOP
      EXECUTE format('update public.biographies set status = %L where id = %L', st, d_id);
      r := pg_temp.dry_try('authenticated', d_owner, format('update public.biographies set title = title || %L where id = %L', ' x', d_id));
      expected := CASE WHEN st = ANY (writable) THEN 'ok rows=1'
                       WHEN st = 'removed' THEN 'ok rows=0'
                       ELSE '%author_text_locked%' END;
      results := results || pg_temp.dry_check('testo in stato ' || st, expected, r);
    END LOOP;
    EXECUTE format('update public.biographies set status = %L where id = %L', 'draft', d_id);

    r := pg_temp.dry_try('authenticated', p_owner, format('update public.biographies set final_version = coalesce(final_version, %L) || %L where id = %L', '', 'x', p_id));
    results := results || pg_temp.dry_check('testo in stato published', '%author_text_locked%', r);
    r := pg_temp.dry_try('authenticated', p_owner, format('update public.biographies set final_version = final_version, title = title where id = %L', p_id));
    results := results || pg_temp.dry_check('riscrivere lo stesso testo in published non è una modifica', 'ok rows=1', r);
    r := pg_temp.dry_try('authenticated', p_owner, format('update public.biographies set visibility = visibility, editor_font_size = editor_font_size where id = %L', p_id));
    results := results || pg_temp.dry_check('colonne che non sono testo restano scrivibili in published', 'ok rows=1', r);

    -- 2) Colonne riservate al server.
    FOREACH label IN ARRAY ARRAY['view_count = 999999', 'ai_screening_status = ''passed''', 'is_frozen = true', 'final_pdf_approved_at = now()', 'status = ''published''', 'published_at = now()'] LOOP
      r := pg_temp.dry_try('authenticated', d_owner, format('update public.biographies set %s where id = %L', label, d_id));
      results := results || pg_temp.dry_check('colonna riservata (bozza): ' || label, '%server_only_column%', r);
    END LOOP;
    r := pg_temp.dry_try('authenticated', p_owner, format('update public.biographies set status = %L where id = %L', 'draft', p_id));
    results := results || pg_temp.dry_check('published -> draft dal browser', '%server_only_column%', r);

    -- 3) Profili.
    r := pg_temp.dry_try('authenticated', d_owner, format('update public.profiles set role = %L where id = %L', 'super_admin', d_owner));
    results := results || pg_temp.dry_check('profilo: role = super_admin', '%server_only_column%', r);
    r := pg_temp.dry_try('authenticated', d_owner, format('update public.profiles set account_status = %L where id = %L', 'suspended', d_owner));
    results := results || pg_temp.dry_check('profilo: account_status', '%server_only_column%', r);
    r := pg_temp.dry_try('authenticated', d_owner, format('update public.profiles set name = name where id = %L', d_owner));
    results := results || pg_temp.dry_check('profilo: campo ordinario', 'ok rows=1', r);

    -- 4) Schede altrui.
    IF other_user IS NOT NULL THEN
      r := pg_temp.dry_try('authenticated', other_user, format('update public.biographies set title = title || %L where id = %L', ' x', d_id));
      results := results || pg_temp.dry_check('scheda altrui (bozza)', 'ok rows=0', r);
    END IF;

    -- 5) Tabelle figlie: solo dove esistono righe (nessun INSERT).
    FOREACH tbl IN ARRAY ARRAY['biography_media', 'biography_book_structure', 'biography_sections', 'person_events', 'person_relations'] LOOP
      col := CASE tbl WHEN 'biography_media' THEN 'caption' WHEN 'biography_book_structure' THEN 'dedication_content'
                      WHEN 'biography_sections' THEN 'content' ELSE 'source_note' END;
      FOR bio_id, owner_id, label IN SELECT d_id, d_owner, 'bozza' UNION ALL SELECT p_id, p_owner, 'pubblicata' LOOP
        EXECUTE format('select count(*) from public.%I where biography_id = %L', tbl, bio_id) INTO cnt;
        IF cnt = 0 THEN
          results := results || jsonb_build_object('prova', tbl || ' (' || label || ')', 'atteso', 'righe presenti', 'ottenuto', 'nessuna riga: non provata qui (coperta dal banco)', 'ok', true, 'saltata', true);
        ELSE
          r := pg_temp.dry_try('authenticated', owner_id, format('update public.%I set %I = %I where biography_id = %L', tbl, col, col, bio_id));
          results := results || pg_temp.dry_check(tbl || ' (' || label || ', ' || cnt || ' righe)',
            CASE label WHEN 'bozza' THEN 'ok rows=' || cnt ELSE '%author_text_locked%' END, r);
        END IF;
      END LOOP;
    END LOOP;

    -- 6) Ruolo di servizio e registro delle impronte.
    r := pg_temp.dry_try('service_role', null, format('update public.biographies set final_version = coalesce(final_version, %L) where id = %L', '', p_id));
    results := results || pg_temp.dry_check('servizio scrive in published', 'ok rows=1', r);
    r := pg_temp.dry_try('authenticated', p_owner, 'select count(*) from public.publication_records');
    results := results || pg_temp.dry_check('publication_records: authenticated', '%permission denied%', r);
    r := pg_temp.dry_try('anon', null, 'select count(*) from public.publication_records');
    results := results || pg_temp.dry_check('publication_records: anon', '%permission denied%', r);
    r := pg_temp.dry_try('service_role', null, 'select count(*) from public.publication_records');
    results := results || pg_temp.dry_check('publication_records: servizio', 'ok%', r);
    r := pg_temp.dry_try('authenticated', p_owner, 'select count(*) from public.ai_token_usage');
    results := results || pg_temp.dry_check('ai_token_usage: lettura delle proprie righe', 'ok%', r);
    r := pg_temp.dry_try('authenticated', p_owner, 'update public.ai_token_usage set ok = ok');
    results := results || pg_temp.dry_check('ai_token_usage: scrittura dell''autore', '%permission denied%', r);
  END IF;

  PERFORM set_config('dry.results', results::text, true);
END
$t$`;

const md5 = (text) => createHash('md5').update(text, 'utf8').digest('hex');

/** Il testo esatto di ogni pezzo incorporato nello script: serve al controllo md5 fatto dal blocco stesso. */
function pieces() {
  const migrations = RELEASE_ORDER.map(({ file, when }, i) => {
    const tag = `mig${i + 1}`;
    const body = compact(readFileSync(join(MIGRATIONS, file), 'utf8'));
    if (body.includes(`$${tag}$`)) throw new Error(`tag ${tag} presente nel testo di ${file}`);
    const text = `\n${body}\n`;
    return { file, when, tag, text, md5: md5(text), variable: `m${i + 1}` };
  });
  const catalog = { text: CATALOG_SQL, md5: md5(CATALOG_SQL) };
  const testsText = `\n${TESTS_SQL}\n`;
  const tests = { text: testsText, md5: md5(testsText) };
  if (catalog.text.includes('$cat$') || tests.text.includes('$tst$')) throw new Error('tag duplicato');
  return { migrations, catalog, tests };
}

/** md5 attesi dei pezzi incorporati: il resoconto della prova li riporta e devono coincidere. */
export function expectedChecksums() {
  const { migrations, catalog, tests } = pieces();
  return {
    catalogo: catalog.md5,
    prove: tests.md5,
    ...Object.fromEntries(migrations.map((m) => [m.file, m.md5])),
  };
}

export function buildDryRun() {
  const { migrations, catalog, tests } = pieces();

  const declarations = migrations
    .map((m) => `  ${m.variable} constant text := $${m.tag}$${m.text}$${m.tag}$;`)
    .join('\n');

  const checksumEntries = [
    `'catalogo', md5(cat_sql)`,
    `'prove', md5(tests_sql)`,
    ...migrations.map((m) => `'${m.file}', md5(${m.variable})`),
  ].join(',\n      ');

  const applyBlock = migrations
    .map(
      (m) => `    current_mig := '${m.file} (${m.when})';
    EXECUTE ${m.variable};
    applied := applied || jsonb_build_object('migrazione', current_mig, 'fine_ms', round(extract(epoch FROM clock_timestamp() - t0) * 1000));`
    )
    .join('\n');

  return `-- PROVA A SECCO (non persiste nulla: il blocco termina sempre con un'eccezione che annulla tutto)
DO $dry$
DECLARE
  t0 timestamptz := clock_timestamp();
  cat_sql constant text := $cat$${catalog.text}$cat$;
  tests_sql constant text := $tst$${tests.text}$tst$;
${declarations}
  before_cat jsonb;
  after_cat jsonb;
  applied jsonb := '[]'::jsonb;
  results jsonb := '[]'::jsonb;
  current_mig text;
  failed text;
  tests_error text;
  k text; delta jsonb := '{}'::jsonb; added jsonb; removed jsonb;
  n_pass int; n_fail int;
  t_first_lock numeric;
  checks jsonb;
BEGIN
  PERFORM set_config('lock_timeout', '3s', true);
  PERFORM set_config('statement_timeout', '60s', true);

  checks := jsonb_build_object(
      ${checksumEntries}
  );

  EXECUTE cat_sql INTO before_cat;
  t_first_lock := round(extract(epoch FROM clock_timestamp() - t0) * 1000);

  BEGIN
${applyBlock}
  EXCEPTION WHEN OTHERS THEN
    failed := current_mig || ' -> ' || SQLSTATE || ': ' || SQLERRM;
  END;

  IF failed IS NULL THEN
    EXECUTE cat_sql INTO after_cat;

    FOREACH k IN ARRAY ARRAY['triggers','policies','functions','tables','constraints','indexes','privileges'] LOOP
      SELECT coalesce(jsonb_agg(v), '[]'::jsonb) INTO added
        FROM jsonb_array_elements_text(after_cat -> k) v
        WHERE v NOT IN (SELECT jsonb_array_elements_text(before_cat -> k));
      SELECT coalesce(jsonb_agg(v), '[]'::jsonb) INTO removed
        FROM jsonb_array_elements_text(before_cat -> k) v
        WHERE v NOT IN (SELECT jsonb_array_elements_text(after_cat -> k));
      delta := delta || jsonb_build_object(k, jsonb_build_object('aggiunti', added, 'tolti', removed));
    END LOOP;

    BEGIN
      PERFORM set_config('dry.results', '', true);
      EXECUTE tests_sql;
      results := coalesce(nullif(current_setting('dry.results', true), ''), '[]')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      tests_error := SQLSTATE || ': ' || SQLERRM;
    END;
  END IF;

  SELECT count(*) FILTER (WHERE (e ->> 'ok')::boolean), count(*) FILTER (WHERE NOT (e ->> 'ok')::boolean)
    INTO n_pass, n_fail FROM jsonb_array_elements(results) e;

  RAISE EXCEPTION 'DRYRUN_RESULT %', jsonb_build_object(
    'durata_ms', round(extract(epoch FROM clock_timestamp() - t0) * 1000),
    'primo_blocco_ms', t_first_lock,
    'controllo_md5', checks,
    'migrazioni_applicate', applied,
    'errore_migrazione', failed,
    'errore_prove', tests_error,
    'prove_ok', n_pass,
    'prove_fallite', n_fail,
    'prove', results,
    'delta_catalogo', delta
  )::text;
END
$dry$;
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--checksums')) {
    process.stdout.write(JSON.stringify(expectedChecksums(), null, 2) + '\n');
  } else if (process.argv.includes('--order')) {
    process.stdout.write(JSON.stringify(RELEASE_ORDER.map((m) => m.file)) + '\n');
  } else {
    process.stdout.write(buildDryRun());
  }
}
