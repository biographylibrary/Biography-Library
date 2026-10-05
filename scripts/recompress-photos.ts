/**
 * Ricomprime le foto già caricate nel bucket `biography-photos`, con le stesse regole della rotta
 * di caricamento (lib/server/photo-processing.ts): orientamento applicato, sRGB, metadati e posizione
 * GPS tolti, lato lungo al massimo 2560 pixel (galleria) o 3100 (copertine), JPEG mozjpeg qualità 85.
 *
 * Per impostazione predefinita lavora in SIMULAZIONE: legge, calcola e riporta per ogni file la
 * dimensione attuale e quella stimata, senza scrivere nulla. Con --apply ricomprime davvero: scrive il
 * file nuovo, lo rilegge, aggiorna la riga di biography_media e solo dopo cancella il vecchio.
 *
 * Usi:
 *   npm run photos:recompress                          simulazione su tutte le foto
 *   npm run photos:recompress -- --biography <id>      solo una biografia
 *   npm run photos:recompress -- --limit 20            solo le prime 20 righe
 *   npm run photos:recompress -- --csv report.csv      scrive anche un riepilogo per foto
 *   npm run photos:recompress -- --apply               ricomprime davvero (serve la migrazione 20261006110000)
 *
 * Tocca solo il bucket `biography-photos`: il bucket `archive` (pacchetti sigillati) non si apre mai.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  KIND_OF_LAYOUT,
  recompressPhotoRow,
  summarize,
  type RecompressDeps,
  type RecompressOutcome,
  type RecompressRow,
} from '@/lib/server/photo-recompression';
import { PHOTO_BUCKET } from '@/lib/server/photo-storage';

function loadEnv(): Record<string, string> {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

interface Args {
  apply: boolean;
  biography: string | null;
  limit: number | null;
  csv: string | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false, biography: null, limit: null, csv: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--biography') args.biography = argv[++i] ?? null;
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--csv') args.csv = argv[++i] ?? null;
    else {
      console.error(`Opzione sconosciuta: ${a}`);
      process.exit(1);
    }
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit <= 0)) {
    console.error('--limit vuole un numero intero positivo.');
    process.exit(1);
  }
  return args;
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const pad = (s: string | number, n: number) => String(s).padStart(n);

/** Una riga il cui file non sta nel bucket delle foto (indirizzo esterno, demo) non si tocca. */
function isInPhotoBucket(fileUrl: string): boolean {
  if (!/^https?:\/\//i.test(fileUrl)) return true; // percorso nudo, come scriveva il codice di prima
  try {
    return new URL(fileUrl).pathname.includes(`/${PHOTO_BUCKET}/`);
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const bucket = client.storage.from(PHOTO_BUCKET);

  // Le colonne width, height, bytes, original_bytes esistono solo dopo la migrazione 20261006110000.
  const BASE = 'id, biography_id, user_id, file_url, file_name, layout';
  const EXTENDED = `${BASE}, width, height, bytes, original_bytes`;
  let hasDimensionColumns = true;
  const rows: RecompressRow[] = [];
  for (let from = 0; ; from += 1000) {
    let query = client
      .from('biography_media')
      .select(hasDimensionColumns ? EXTENDED : BASE)
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (args.biography) query = query.eq('biography_id', args.biography);
    const { data, error } = await query;
    if (error && hasDimensionColumns && /column .* does not exist|width|original_bytes/i.test(error.message)) {
      hasDimensionColumns = false;
      from -= 1000; // si rilegge la stessa pagina senza le colonne nuove
      continue;
    }
    if (error) {
      console.error(`Lettura di biography_media fallita: ${error.message}`);
      process.exit(1);
    }
    const page = (data ?? []) as unknown as RecompressRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }

  if (!hasDimensionColumns) {
    console.log('ATTENZIONE: le colonne width, height, bytes, original_bytes non esistono ancora (migrazione');
    console.log('20261006110000 non applicata). La simulazione funziona, ma tutte le foto risultano «non ancora');
    console.log('elaborate dal server»; --apply è rifiutato finché la migrazione non c\'è.\n');
    if (args.apply) {
      console.error('--apply rifiutato: applica prima la migrazione 20261006110000_biography_media_dimensions.sql.');
      process.exit(1);
    }
  }

  const inBucket = rows.filter((r) => isInPhotoBucket(r.file_url));
  const outside = rows.length - inBucket.length;
  const selected = args.limit ? inBucket.slice(0, args.limit) : inBucket;

  console.log(args.apply ? 'MODO: --apply (scrive davvero)' : 'MODO: simulazione (non scrive nulla)');
  console.log(`Righe in biography_media: ${rows.length}, nel bucket ${PHOTO_BUCKET}: ${inBucket.length}, fuori bucket (ignorate): ${outside}`);
  console.log(`Righe da esaminare: ${selected.length}\n`);

  const deps: RecompressDeps = {
    download: async (path) => {
      const { data, error } = await bucket.download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
    upload: async (path, data) => {
      const { error } = await bucket.upload(path, data, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
      return { error: error?.message ?? null };
    },
    remove: async (paths) => {
      const { error } = await bucket.remove(paths);
      return { error: error?.message ?? null };
    },
    publicUrl: (path) => bucket.getPublicUrl(path).data.publicUrl,
    updateRow: async (id, patch) => {
      const { error } = await client.from('biography_media').update(patch).eq('id', id);
      return { error: error?.message ?? null };
    },
    readRow: async (id) => {
      const { data } = await client.from('biography_media').select('file_url, bytes').eq('id', id).maybeSingle();
      return (data as { file_url: string; bytes: number | null } | null) ?? null;
    },
    countOtherReferences: async (path, exceptId) => {
      // `like` considera `_` e `%` come caratteri jolly: il conteggio può solo eccedere, e in quel caso
      // il file vecchio resta (più prudente).
      const { count, error } = await client
        .from('biography_media')
        .select('id', { count: 'exact', head: true })
        .neq('id', exceptId)
        .like('file_url', `%${path}`);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  };

  const outcomes: RecompressOutcome[] = [];
  const csvLines = ['id,biography_id,layout,kind,esito,motivo,byte_prima,byte_dopo,larghezza_prima,altezza_prima,larghezza_dopo,altezza_dopo'];

  for (const row of selected) {
    const outcome = await recompressPhotoRow(deps, row, { apply: args.apply });
    outcomes.push(outcome);
    const kind = KIND_OF_LAYOUT(row.layout);
    const label = `${row.id.slice(0, 8)} ${row.layout.padEnd(13)}`;

    if (outcome.status === 'error') {
      console.log(`${label} ERRORE (${outcome.step}): ${outcome.message}`);
      csvLines.push([row.id, row.biography_id, row.layout, kind, 'errore', JSON.stringify(`${outcome.step}: ${outcome.message}`), outcome.before?.bytes ?? '', '', '', '', '', ''].join(','));
    } else if (outcome.status === 'skipped') {
      const why = outcome.reason === 'already_processed' ? 'già elaborata' : 'già a posto';
      console.log(`${label} salta (${why}) ${pad(mb(outcome.before.bytes), 10)}`);
      csvLines.push([row.id, row.biography_id, row.layout, kind, 'saltata', why, outcome.before.bytes, outcome.before.bytes, outcome.before.width, outcome.before.height, '', ''].join(','));
    } else {
      const saved = 100 - (outcome.after.bytes / outcome.before.bytes) * 100;
      const verb = outcome.status === 'recompressed' ? 'ricompressa' : 'stima';
      const note = outcome.status === 'recompressed' && outcome.oldKept ? `  [file vecchio tenuto: ${outcome.oldKept}]` : '';
      console.log(
        `${label} ${verb} ${pad(mb(outcome.before.bytes), 10)} -> ${pad(mb(outcome.after.bytes), 10)} (${saved.toFixed(0)}%)  ` +
          `${outcome.before.width}x${outcome.before.height} -> ${outcome.after.width}x${outcome.after.height}${note}`
      );
      csvLines.push([row.id, row.biography_id, row.layout, kind, verb, outcome.status === 'recompressed' && outcome.oldKept ? `vecchio tenuto: ${outcome.oldKept}` : '', outcome.before.bytes, outcome.after.bytes, outcome.before.width, outcome.before.height, outcome.after.width, outcome.after.height].join(','));
    }
  }

  const t = summarize(outcomes);
  const gain = t.bytesBefore > 0 ? 100 - (t.bytesAfter / t.bytesBefore) * 100 : 0;
  console.log('\n--- Riepilogo ---');
  console.log(`Foto esaminate:                 ${t.files}`);
  console.log(`  già elaborate dal server:     ${t.skippedProcessed}`);
  console.log(`  già a posto (non serve):      ${t.skippedWithinLimits}`);
  console.log(`  ${args.apply ? 'ricompresse' : 'da ricomprimere'}:${' '.repeat(args.apply ? 18 : 12)}${args.apply ? t.recompressed : t.wouldRecompress}`);
  console.log(`  con errore:                   ${t.errors}`);
  console.log(`Peso prima:                     ${mb(t.bytesBefore)}`);
  console.log(`Peso ${args.apply ? 'dopo' : 'stimato dopo'}:${' '.repeat(args.apply ? 20 : 10)}${mb(t.bytesAfter)}  (${gain.toFixed(0)}% in meno)`);

  if (args.csv) {
    writeFileSync(resolve(process.cwd(), args.csv), `${csvLines.join('\n')}\n`);
    console.log(`\nRiepilogo per foto scritto in ${args.csv}`);
  }
  if (t.errors > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
