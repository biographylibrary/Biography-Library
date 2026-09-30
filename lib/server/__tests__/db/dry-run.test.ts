import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb } from './harness';

/**
 * Prova generale della prova a secco (scripts/build-dry-run.mjs) sul banco locale:
 * lo stesso testo che si eseguirà in produzione, dopo conferma, dentro un blocco che
 * termina SEMPRE con un'eccezione. Qui si dimostra che (1) applica le migrazioni
 * nell'ordine di rilascio, (2) le prove danno l'esito atteso, (3) non lascia nulla
 * (catalogo e dati identici prima e dopo) e (4) non consuma sequenze.
 */
const ALIGN = '20260930115900_align_biographies_profiles_triggers.sql';

let db: PGlite;
let script: string;

// Prima delle migrazioni nuove la produzione ha già l'allineamento e queste due tabelle.
const STUBS = `
  create table public.agent_threads (id uuid primary key default gen_random_uuid(), user_id uuid, agent_type text not null default 'echo');
  alter table public.agent_threads add constraint agent_threads_agent_type_check check (agent_type in ('echo','platform_guide','biography_coach','publication_reviewer'));
  create table public.biography_view_translations (id uuid primary key default gen_random_uuid(), biography_id uuid);
  grant all on public.agent_threads, public.biography_view_translations to authenticated, anon, service_role;
`;

beforeAll(async () => {
  script = execFileSync('node', ['scripts/build-dry-run.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
  db = await createTestDb({ only: [ALIGN] });
  await db.exec(STUBS);
  // Un thread "platform_guide" da eliminare, e una riga di traduzione.
  await db.exec(`insert into public.agent_threads (agent_type) values ('echo'), ('platform_guide');`);
  // Righe figlie su una bozza e su una pubblicata, come in produzione, così le prove sulle cinque tabelle girano davvero.
  await db.exec(`set session_replication_role = replica;`);
  for (const bio of [BIO.draft, BIO.published]) {
    await db.query(`insert into public.biography_media (biography_id, user_id, file_url, caption) values ($1, $2, 'https://x/f.jpg', 'didascalia')`, [bio, U.author]);
    await db.query(`insert into public.biography_book_structure (biography_id, user_id, dedication_content) values ($1, $2, 'dedica')`, [bio, U.author]);
    await db.query(`insert into public.biography_sections (biography_id, section_key, content) values ($1, 'childhood', 'testo')`, [bio]);
    await db.query(`insert into public.person_events (biography_id, event_type, source_note) values ($1, 'birth', 'nota')`, [bio]);
    await db.query(`insert into public.person_relations (biography_id, relation_code, source_note) values ($1, 'parent', 'nota')`, [bio]);
  }
  await db.exec(`set session_replication_role = origin;`);
}, 120_000);

afterAll(async () => {
  await db.close();
});

async function snapshot() {
  const one = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows;
  return {
    triggers: await one(`select c.relname, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and c.relnamespace = 'public'::regnamespace order by 1, 2`),
    policies: await one(`select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2`),
    functions: await one(`select p.proname, md5(p.prosrc) as h from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1, 2`),
    tables: await one(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','S') order by 1`),
    threads: await one(`select agent_type from public.agent_threads order by 1`),
    seq: await one(`select last_value, is_called from public.biography_host_seq`),
    biographies: await one(`select id, status, title, final_version, view_count from public.biographies order by id`),
    profiles: await one(`select id, role, account_status from public.profiles order by id`),
    children: await one(`select (select count(*) from public.biography_media) as media, (select count(*) from public.biography_book_structure) as book, (select count(*) from public.biography_sections) as sections, (select count(*) from public.person_events) as events, (select count(*) from public.person_relations) as relations, (select md5(string_agg(caption, ',')) from public.biography_media) as captions`),
  };
}

async function runDry(): Promise<{ message: string; report: Record<string, any> }> {
  let message = '';
  try {
    await db.exec(script);
    throw new Error('IL BLOCCO NON HA SOLLEVATO: la prova a secco avrebbe scritto davvero');
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  expect(message).toContain('DRYRUN_RESULT');
  return { message, report: JSON.parse(message.slice(message.indexOf('DRYRUN_RESULT') + 'DRYRUN_RESULT'.length).trim()) };
}

describe('prova a secco: prova generale sul banco', () => {
  it('applica le sette migrazioni nell\'ordine di rilascio e nessuna fallisce', async () => {
    const { report } = await runDry();
    expect(report.errore_migrazione).toBeNull();
    expect(report.migrazioni_applicate.map((m: { migrazione: string }) => m.migrazione.split(' ')[0])).toEqual([
      '20260930115700_publication_records.sql',
      '20260930115800_ai_token_usage.sql',
      '20260930115900_align_biographies_profiles_triggers.sql',
      '20260930120000_server_only_columns_and_reports.sql',
      '20260930120100_drop_biography_view_translations.sql',
      '20260930120150_author_text_whitelist.sql',
      '20260930120200_agent_threads_echo_only.sql',
    ]);
    const labels = report.migrazioni_applicate.map((m: { migrazione: string }) => m.migrazione);
    expect(labels.filter((m: string) => m.includes('(prima del deploy)'))).toHaveLength(2);
    expect(labels.filter((m: string) => m.includes('(dopo il deploy)'))).toHaveLength(5);
  });

  it('il blocco controlla da sé il testo che esegue: gli md5 coincidono con quelli calcolati dai file', async () => {
    const { report } = await runDry();
    const expected = JSON.parse(execFileSync('node', ['scripts/build-dry-run.mjs', '--checksums'], { encoding: 'utf8' }));
    expect(report.controllo_md5).toEqual(expected);
    expect(Object.keys(expected)).toHaveLength(9);
  });

  it('i tempi sono registrati: durata totale, primo blocco e fine di ogni migrazione', async () => {
    const { report } = await runDry();
    expect(typeof report.durata_ms).toBe('number');
    expect(report.primo_blocco_ms).toBeLessThanOrEqual(report.durata_ms);
    const ends = report.migrazioni_applicate.map((m: { fine_ms: number }) => m.fine_ms);
    expect(ends).toEqual([...ends].sort((a: number, b: number) => a - b));
  });

  it('l\'ordine dei nomi dei file coincide con l\'ordine di applicazione in produzione', () => {
    const order: string[] = JSON.parse(execFileSync('node', ['scripts/build-dry-run.mjs', '--order'], { encoding: 'utf8' }));
    const files = readdirSync(join(process.cwd(), 'supabase', 'migrations')).filter((f) => f.endsWith('.sql')).sort();
    // Le sette del blocco 1 compaiono nei file nello stesso ordine in cui si applicano...
    expect(files.filter((f) => order.includes(f))).toEqual(order);
    // ...sono le ultime del repository, e le versioni (il prefisso numerico) sono tutte diverse.
    expect(files.slice(-order.length)).toEqual(order);
    const versions = order.map((f) => f.split('_')[0]);
    expect(new Set(versions).size).toBe(order.length);
    expect(versions).toEqual([...versions].sort());
  });

  it('l\'elenco del banco di prova è nello stesso ordine dei nomi dei file', () => {
    const src = readFileSync(join(process.cwd(), 'lib/server/__tests__/db/harness.ts'), 'utf8');
    const names = src.match(/'2026\d{10}_[a-z_]+\.sql'/g)?.map((m) => m.slice(1, -1)) ?? [];
    expect(names.length).toBeGreaterThanOrEqual(5);
    expect(names).toEqual([...names].sort());
  });

  it('tutte le prove danno l\'esito atteso', async () => {
    const { report } = await runDry();
    const failed = report.prove.filter((p: { ok: boolean }) => !p.ok);
    expect(failed).toEqual([]);
    expect(report.prove_fallite).toBe(0);
    expect(report.prove_ok).toBeGreaterThanOrEqual(30);
    // Con righe figlie presenti, le cinque tabelle vengono provate davvero (nessuna saltata).
    expect(report.prove.filter((p: { saltata?: boolean }) => p.saltata)).toEqual([]);
    const child = report.prove.filter((p: { prova: string }) => /^(biography_|person_)/.test(p.prova));
    expect(child).toHaveLength(10);
    expect(child.filter((p: { ottenuto: string }) => p.ottenuto.includes('author_text_locked'))).toHaveLength(5);
    expect(child.filter((p: { ottenuto: string }) => p.ottenuto.startsWith('ok rows='))).toHaveLength(5);
    const names = report.prove.map((p: { prova: string }) => p.prova);
    for (const st of ['draft', 'pdf_draft', 'revision_requested', 'under_review', 'locked_pending_screening', 'revision_overdue', 'removed']) {
      expect(names).toContain(`testo in stato ${st}`);
    }
  });

  it('non lascia nulla: catalogo, dati e sequenze identici prima e dopo', async () => {
    const before = await snapshot();
    const { report } = await runDry();
    expect(report.prove_fallite).toBe(0);
    expect(await snapshot()).toEqual(before);
  });

  it('il delta del catalogo contiene quello che le migrazioni devono fare', async () => {
    const { report } = await runDry();
    const d = report.delta_catalogo;
    expect(d.triggers.aggiunti.map((t: string) => t.split('#')[0])).toEqual(
      expect.arrayContaining([
        'biographies.a00_biographies_guard_server_columns',
        'profiles.a00_profiles_guard_server_columns',
        'biographies.a01_biographies_guard_author_text',
        'biography_sections.a01_biography_sections_guard_parent_status',
        'biography_media.a01_biography_media_guard_parent_status',
      ])
    );
    expect(d.policies.tolti.map((p: string) => p.split('|')[1])).toEqual(
      expect.arrayContaining(['Any authenticated user can file a report', 'Anonymous users can file a report without reporter_id', 'Users can insert own profile'])
    );
    expect(d.tables.aggiunti.map((t: string) => t.split('|')[0])).toEqual(
      expect.arrayContaining(['publication_records', 'ai_token_usage', 'ai_author_token_limits'])
    );
    expect(d.tables.tolti.map((t: string) => t.split('|')[0])).toEqual(['biography_view_translations']);
    expect(d.constraints.aggiunti.join('\n')).toContain("agent_threads|agent_threads_agent_type_check|CHECK ((agent_type = 'echo'::text))");
    // L'allineamento non cambia nulla: nessuna funzione "tolta" che non sia anche "aggiunta" con lo stesso nome.
    expect(d.functions.tolti).toEqual([]);
  });

  it('elimina i thread che non sono di Echo (ed è annullato)', async () => {
    const { report } = await runDry();
    expect(report.errore_migrazione).toBeNull();
    const rows = (await db.query<{ agent_type: string }>(`select agent_type from public.agent_threads order by 1`)).rows;
    expect(rows.map((r) => r.agent_type)).toEqual(['echo', 'platform_guide']);
  });

  it('controllo negativo: se una migrazione fallisce lo dice e non prova nulla', async () => {
    const broken = script.replace('ALTER TABLE public.agent_threads DROP CONSTRAINT IF EXISTS agent_threads_agent_type_check;', 'SELECT 1/0;');
    expect(broken).not.toBe(script);
    let message = '';
    try {
      await db.exec(broken);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    const report = JSON.parse(message.slice(message.indexOf('DRYRUN_RESULT') + 13).trim());
    expect(report.errore_migrazione).toContain('agent_threads_echo_only');
    expect(report.prove).toEqual([]);
  });

  it('controllo negativo: se il guard non ci fosse, le prove se ne accorgerebbero', async () => {
    const weak = script.replace(/'%server_only_column%'/g, "'ok rows=1'");
    // Il guard c'è: quelle prove, attese al contrario, devono risultare fallite.
    let message = '';
    try {
      await db.exec(weak);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    const report = JSON.parse(message.slice(message.indexOf('DRYRUN_RESULT') + 13).trim());
    expect(report.prove_fallite).toBeGreaterThan(0);
  });

  it('usa solo UPDATE e SELECT: nessun INSERT né DELETE nelle prove', () => {
    const tests = script.slice(script.indexOf('IF failed IS NULL THEN'));
    expect(tests).not.toMatch(/\binsert\s+into\b/i);
    expect(tests).not.toMatch(/\bdelete\s+from\b/i);
  });

  it('il blocco termina sempre con un\'eccezione', () => {
    const tail = script.trimEnd();
    expect(tail.endsWith('$dry$;')).toBe(true);
    expect(script).toMatch(/RAISE EXCEPTION 'DRYRUN_RESULT %'[\s\S]*END\s*\$dry\$;/);
    expect(script).not.toMatch(/\bCOMMIT\b/);
  });
});

// Serve a non far scartare gli import usati solo per chiarezza del seme.
void BIO;
void U;
void as;
