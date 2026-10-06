import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { U, as, createTestDb, errorOf } from './harness';

/**
 * Bucket delle foto sotto controllo di versione e chiusura della porta laterale:
 *   20261006100000  descrive il bucket e le quattro policy com'erano in produzione, senza cambiare nulla
 *   20261006110000  colonne width, height, bytes, original_bytes in biography_media
 *   20261006120000  toglie agli utenti la scrittura diretta nel bucket e fissa il limite di dimensione
 * Il banco non ha il servizio di archiviazione di Supabase: se ne crea lo schema essenziale.
 */
const read = (name: string) => readFileSync(join(process.cwd(), 'supabase', name), 'utf8');
const BUCKET_SQL = read('migrations/20261006100000_storage_biography_photos_bucket.sql');
const DIMENSIONS_SQL = read('migrations/20261006110000_biography_media_dimensions.sql');
const SERVER_ONLY_SQL = read('migrations/20261006120000_storage_biography_photos_server_only_writes.sql');
const ROLLBACK_SQL = read('rollback/20261006_storage_biography_photos_rollback.sql');

/** Le definizioni lette da pg_policies in produzione il 6 ottobre 2026 (project gckmusbozgbclokvbnwx). */
const PRODUCTION_POLICIES = [
  {
    policyname: 'Users can delete own files',
    cmd: 'DELETE',
    roles: '{authenticated}',
    qual: "((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))",
    with_check: null,
  },
  {
    policyname: 'Users can read own files',
    cmd: 'SELECT',
    roles: '{authenticated}',
    qual: "((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))",
    with_check: null,
  },
  {
    policyname: 'Users can update own files',
    cmd: 'UPDATE',
    roles: '{authenticated}',
    qual: "((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))",
    with_check: "((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))",
  },
  {
    policyname: 'Users can upload to own folder',
    cmd: 'INSERT',
    roles: '{authenticated}',
    qual: null,
    with_check: "((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))",
  },
];

/** Lo schema essenziale di Supabase Storage (colonne e funzione che le policy usano). */
const STORAGE_STUB = `
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
    public boolean default false, avif_autodetection boolean default false, file_size_limit bigint, allowed_mime_types text[], owner_id text
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid,
    created_at timestamptz default now(), metadata jsonb
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language plpgsql as $$
  declare _parts text[];
  begin
    select string_to_array(name, '/') into _parts;
    return _parts[1:array_length(_parts, 1) - 1];
  end $$;
  grant usage on schema storage to authenticated, anon, service_role;
  grant all on storage.objects, storage.buckets to authenticated, anon, service_role;
`;

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb();
  await db.exec(STORAGE_STUB);
}, 120_000);

afterEach(async () => {
  await db.close();
});

const policies = async () =>
  (
    await db.query<Record<string, unknown>>(
      `select policyname, cmd, roles::text as roles, qual, with_check from pg_policies
        where schemaname = 'storage' and tablename = 'objects' order by policyname`
    )
  ).rows;

const bucket = async () =>
  (await db.query<Record<string, unknown>>(`select id, name, public, avif_autodetection, file_size_limit, allowed_mime_types from storage.buckets where id = 'biography-photos'`)).rows;

const mine = `${U.author}/bio/foto.jpg`;
const theirs = `${U.other}/bio/foto.jpg`;
const insertObject = (user: string, name: string) =>
  as(db, 'authenticated', user, `insert into storage.objects (bucket_id, name, owner) values ('biography-photos', $1, $2)`, [name, user]);

describe('20261006100000: il bucket e le quattro policy come in produzione', () => {
  it('su un database nuovo crea il bucket privato senza limiti e le quattro policy, identiche a quelle di produzione', async () => {
    await db.exec(BUCKET_SQL);
    expect(await bucket()).toEqual([
      { id: 'biography-photos', name: 'biography-photos', public: false, avif_autodetection: false, file_size_limit: null, allowed_mime_types: null },
    ]);
    expect(await policies()).toEqual(PRODUCTION_POLICIES);
  });

  it('dove tutto esiste già (produzione) non cambia niente: né il bucket né le policy', async () => {
    await db.exec(BUCKET_SQL);
    const before = { bucket: await bucket(), policies: await policies() };
    await db.exec(BUCKET_SQL);
    await db.exec(BUCKET_SQL);
    expect({ bucket: await bucket(), policies: await policies() }).toEqual(before);
  });

  it('non tocca un bucket che esiste già con altre impostazioni (come eventuali limiti messi a mano)', async () => {
    await db.exec(`insert into storage.buckets (id, name, public, file_size_limit) values ('biography-photos', 'biography-photos', false, 123456)`);
    await db.exec(BUCKET_SQL);
    expect((await bucket())[0]).toMatchObject({ file_size_limit: 123456 });
  });

  it('non tocca gli altri bucket', async () => {
    await db.exec(`insert into storage.buckets (id, name, public) values ('archive', 'archive', false), ('biography-exports', 'biography-exports', true)`);
    await db.exec(BUCKET_SQL);
    const ids = (await db.query<{ id: string }>(`select id from storage.buckets order by id`)).rows.map((r) => r.id);
    expect(ids).toEqual(['archive', 'biography-exports', 'biography-photos']);
  });

  it('comportamento di prima: ognuno scrive, legge, aggiorna e cancella solo nella propria cartella', async () => {
    await db.exec(BUCKET_SQL);
    expect(await errorOf(() => insertObject(U.author, mine))).toBeNull();
    expect(await errorOf(() => insertObject(U.author, theirs))).toContain('row-level security');
    // Un altro utente non vede il file e non lo aggiorna né lo cancella.
    expect(await as(db, 'authenticated', U.other, `select name from storage.objects`)).toEqual([]);
    expect(await as(db, 'authenticated', U.other, `update storage.objects set name = name where name = $1 returning name`, [mine])).toEqual([]);
    expect(await as(db, 'authenticated', U.other, `delete from storage.objects where name = $1 returning name`, [mine])).toEqual([]);
    // Il proprietario sì.
    expect(await as(db, 'authenticated', U.author, `select name from storage.objects`)).toEqual([{ name: mine }]);
    expect(await as(db, 'authenticated', U.author, `update storage.objects set metadata = '{}' where name = $1 returning name`, [mine])).toHaveLength(1);
    // Un anonimo non vede niente.
    expect(await as(db, 'anon', null, `select name from storage.objects`)).toEqual([]);
  });
});

describe('20261006110000: dimensioni delle foto', () => {
  it('aggiunge quattro colonne facoltative, e le righe esistenti restano valide', async () => {
    const cols = (
      await db.query<{ column_name: string; is_nullable: string; data_type: string }>(
        `select column_name, is_nullable, data_type from information_schema.columns
          where table_schema = 'public' and table_name = 'biography_media' and column_name in ('width','height','bytes','original_bytes') order by column_name`
      )
    ).rows;
    expect(cols).toEqual([
      { column_name: 'bytes', is_nullable: 'YES', data_type: 'integer' },
      { column_name: 'height', is_nullable: 'YES', data_type: 'integer' },
      { column_name: 'original_bytes', is_nullable: 'YES', data_type: 'integer' },
      { column_name: 'width', is_nullable: 'YES', data_type: 'integer' },
    ]);
  });

  it('si può riapplicare senza errori, e i valori non positivi sono rifiutati', async () => {
    await db.exec(DIMENSIONS_SQL);
    await db.exec(DIMENSIONS_SQL);
    const base = `insert into public.biography_media (biography_id, user_id, file_url, layout, display_order, %cols) values ('10000000-0000-0000-0000-000000000001', '${U.author}', 'u/x.jpg', 'full-page', 1, %vals)`;
    await db.exec(base.replace('%cols', 'width, height, bytes, original_bytes').replace('%vals', '2560, 1920, 800000, 4000000'));
    for (const col of ['width', 'height', 'bytes', 'original_bytes']) {
      const err = await errorOf(() => db.exec(base.replace('%cols', col).replace('%vals', '0')));
      expect(err, col).toContain('check constraint');
    }
  });
});

describe('20261006120000: la scrittura diretta nel bucket si chiude', () => {
  beforeEach(async () => {
    await db.exec(BUCKET_SQL);
    await insertObject(U.author, mine);
    await db.exec(SERVER_ONLY_SQL);
  });

  it('toglie esattamente le policy di inserimento e di aggiornamento, e lascia lettura e cancellazione invariate', async () => {
    const left = await policies();
    expect(left.map((p) => p.policyname)).toEqual(['Users can delete own files', 'Users can read own files']);
    for (const kept of left) {
      expect(kept).toEqual(PRODUCTION_POLICIES.find((p) => p.policyname === kept.policyname));
    }
  });

  it('un utente autenticato non scrive più nel bucket, nemmeno nella propria cartella', async () => {
    expect(await errorOf(() => insertObject(U.author, `${U.author}/bio/nuova.jpg`))).toContain('row-level security');
    expect(await errorOf(() => insertObject(U.author, theirs))).toContain('row-level security');
  });

  it('non sovrascrive e non rinomina nemmeno i propri file (l\'aggiornamento tocca zero righe)', async () => {
    expect(await as(db, 'authenticated', U.author, `update storage.objects set name = $2 where name = $1 returning name`, [mine, `${U.author}/bio/altro.jpg`])).toEqual([]);
    expect(await as(db, 'service_role', null, `select name from storage.objects`)).toEqual([{ name: mine }]);
  });

  it('continua a leggere e a cancellare i propri file, e solo i propri', async () => {
    expect(await as(db, 'authenticated', U.author, `select name from storage.objects`)).toEqual([{ name: mine }]);
    expect(await as(db, 'authenticated', U.other, `delete from storage.objects where name = $1 returning name`, [mine])).toEqual([]);
    expect(await as(db, 'authenticated', U.author, `delete from storage.objects where name = $1 returning name`, [mine])).toEqual([{ name: mine }]);
  });

  it('il ruolo di servizio, che è quello della rotta nuova, scrive come prima', async () => {
    await as(db, 'service_role', null, `insert into storage.objects (bucket_id, name, owner) values ('biography-photos', $1, $2)`, [`${U.author}/bio/dal-server.jpg`, U.author]);
    expect(await as(db, 'authenticated', U.author, `select name from storage.objects order by name`)).toHaveLength(2);
  });

  it('fissa il limite di 20 MiB sul bucket e non cambia nient\'altro del bucket', async () => {
    expect(await bucket()).toEqual([
      { id: 'biography-photos', name: 'biography-photos', public: false, avif_autodetection: false, file_size_limit: 20971520, allowed_mime_types: null },
    ]);
  });

  it('si può riapplicare senza errori', async () => {
    await db.exec(SERVER_ONLY_SQL);
    expect((await policies()).map((p) => p.policyname)).toEqual(['Users can delete own files', 'Users can read own files']);
  });

  it('lo script di ritorno indietro rimette le policy identiche a quelle di produzione e toglie il limite', async () => {
    await db.exec(ROLLBACK_SQL);
    expect(await policies()).toEqual(PRODUCTION_POLICIES);
    expect((await bucket())[0]).toMatchObject({ file_size_limit: null });
    expect(await errorOf(() => insertObject(U.author, `${U.author}/bio/dopo-il-ritorno.jpg`))).toBeNull();
  });
});
