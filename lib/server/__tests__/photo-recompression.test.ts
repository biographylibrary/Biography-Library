import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  decideRecompression,
  recompressPhotoRow,
  summarize,
  type RecompressDeps,
  type RecompressRow,
} from '@/lib/server/photo-recompression';
import { PHOTO_BUCKET, storagePathFromFileUrl } from '@/lib/server/photo-storage';
import { inspectPhoto } from '@/lib/server/photo-processing';

/**
 * Ricompressione delle foto già caricate: ordine delle operazioni (il file vecchio si cancella solo
 * dopo aver verificato il nuovo), ripetibilità, foto già a posto che si saltano. Bucket e database
 * sono finti, in memoria; le immagini e l'elaborazione sono veri.
 */

const URL_BASE = 'https://x.supabase.co/storage/v1/object/public/biography-photos/';

const jpegOf = (w: number, h: number, quality = 92) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 130, g: 90, b: 60 } } })
    .jpeg({ quality })
    .toBuffer();

/** Foto con un po' di dettaglio, perché il peso del file sia significativo. */
async function photoWithNoise(w: number, h: number) {
  const raw = Buffer.alloc(w * h * 3);
  let seed = 7;
  for (let i = 0; i < raw.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    raw[i] = (Math.floor(i / (w * 3)) * 2 + (seed >> 16 & 31)) & 255;
  }
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 97 }).toBuffer();
}

interface World {
  files: Map<string, Buffer>;
  rows: Map<string, Record<string, unknown>>;
  ops: string[];
  failUpload: boolean;
  corruptUpload: boolean;
  failUpdate: boolean;
  badReadBack: boolean;
  /** Quante letture della riga, a partire dalla prossima, restituiscono null (rete che cade). */
  readNull: number;
  failRemove: boolean;
}

let world: World;

function deps(): RecompressDeps {
  return {
    download: async (path) => {
      world.ops.push(`download:${path}`);
      return world.files.get(path) ?? null;
    },
    upload: async (path, data) => {
      world.ops.push(`upload:${path}`);
      if (world.failUpload) return { error: 'upload negato' };
      world.files.set(path, world.corruptUpload ? Buffer.from('rovinato') : data);
      return { error: null };
    },
    remove: async (paths) => {
      world.ops.push(`remove:${paths.join(',')}`);
      if (world.failRemove) return { error: 'remove negato' };
      for (const p of paths) world.files.delete(p);
      return { error: null };
    },
    publicUrl: (path) => `${URL_BASE}${path}`,
    updateRow: async (id, patch) => {
      world.ops.push(`update:${id}`);
      if (world.failUpdate) return { error: 'update negato' };
      world.rows.set(id, { ...world.rows.get(id), ...patch });
      return { error: null };
    },
    readRow: async (id) => {
      world.ops.push(`readRow:${id}`);
      if (world.readNull > 0) {
        world.readNull -= 1;
        return null;
      }
      const row = world.rows.get(id);
      if (!row) return null;
      return { file_url: world.badReadBack ? `${URL_BASE}altro.jpg` : String(row.file_url), bytes: (row.bytes as number | null) ?? null };
    },
    countOtherReferences: async (path, exceptId) => {
      world.ops.push(`refs:${path}`);
      let n = 0;
      for (const [id, r] of Array.from(world.rows.entries())) {
        if (id !== exceptId && storagePathFromFileUrl(String(r.file_url)) === path) n += 1;
      }
      return n;
    },
  };
}

function addPhoto(id: string, data: Buffer, extra: Partial<RecompressRow> = {}): RecompressRow {
  const path = `user-1/bio-1/${id}-vecchia.${extra.file_name?.split('.').pop() ?? 'jpg'}`;
  world.files.set(path, data);
  const row: RecompressRow = {
    id,
    biography_id: 'bio-1',
    user_id: 'user-1',
    file_url: `${URL_BASE}${path}`,
    file_name: 'foto.jpg',
    layout: 'full-page',
    ...extra,
  };
  world.rows.set(id, { ...row });
  return row;
}

beforeEach(() => {
  world = { files: new Map(), rows: new Map(), ops: [], failUpload: false, corruptUpload: false, failUpdate: false, badReadBack: false, readNull: 0, failRemove: false };
});

const bucket = () => Array.from(world.files.keys());

describe('storagePathFromFileUrl e il bucket', () => {
  it('ricava il percorso dall\'indirizzo salvato, anche con caratteri codificati', () => {
    expect(storagePathFromFileUrl(`${URL_BASE}u/b/foto%20uno.jpg`)).toBe('u/b/foto uno.jpg');
    expect(storagePathFromFileUrl('u/b/gia-un-percorso.jpg')).toBe('u/b/gia-un-percorso.jpg');
  });

  it('il bucket è quello delle foto, non quello degli archivi', () => {
    expect(PHOTO_BUCKET).toBe('biography-photos');
  });

  it('lo script non nomina mai il bucket archive come bucket di lavoro (i pacchetti d\'archivio sono sigillati)', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'recompress-photos.ts'), 'utf8');
    expect(script).not.toMatch(/\.from\(\s*['"]archive['"]/);
    expect(script).toMatch(/PHOTO_BUCKET/);
  });
});

describe('decideRecompression', () => {
  const inspection = (over: Partial<Awaited<ReturnType<typeof inspectPhoto>>> = {}) => ({
    format: 'jpeg', width: 1600, height: 1200, bytes: 400_000, hasMetadata: false, hasExif: false, hasAlpha: false, ...over,
  });

  it('salta le foto già elaborate dal server', () => {
    expect(decideRecompression({ processedByServer: true, inspection: inspection({ format: 'png' }), estimatedBytes: 1, kind: 'gallery' })).toEqual({ action: 'skip', reason: 'already_processed' });
  });

  it('salta un JPEG già senza metadati, entro il lato massimo e senza un risparmio utile', () => {
    expect(decideRecompression({ processedByServer: false, inspection: inspection(), estimatedBytes: 390_000, kind: 'gallery' })).toEqual({ action: 'skip', reason: 'within_limits' });
  });

  it('ricomprime quando il risparmio è utile, o c\'è un metadato, o il formato non è JPEG, o il lato è oltre il limite', () => {
    const base = { processedByServer: false, estimatedBytes: 390_000, kind: 'gallery' as const };
    expect(decideRecompression({ ...base, inspection: inspection(), estimatedBytes: 200_000 })).toEqual({ action: 'recompress' });
    expect(decideRecompression({ ...base, inspection: inspection({ hasMetadata: true }) })).toEqual({ action: 'recompress' });
    expect(decideRecompression({ ...base, inspection: inspection({ format: 'png' }) })).toEqual({ action: 'recompress' });
    expect(decideRecompression({ ...base, inspection: inspection({ width: 3000, height: 2000 }) })).toEqual({ action: 'recompress' });
  });

  it('per una copertina il lato massimo è 3100: 3000 pixel sono entro il limite, 3200 no', () => {
    const base = { processedByServer: false, estimatedBytes: 399_000, kind: 'cover' as const };
    expect(decideRecompression({ ...base, inspection: inspection({ width: 3000, height: 2000 }) })).toMatchObject({ action: 'skip' });
    expect(decideRecompression({ ...base, inspection: inspection({ width: 3200, height: 2000 }) })).toEqual({ action: 'recompress' });
  });
});

describe('recompressPhotoRow: simulazione (predefinita)', () => {
  it('riporta dimensione attuale e stimata e non scrive nulla', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    const before = world.files.get('user-1/bio-1/m1-vecchia.jpg')!.length;
    const out = await recompressPhotoRow(deps(), row, { apply: false });
    expect(out.status).toBe('would_recompress');
    if (out.status !== 'would_recompress') return;
    expect(out.before).toEqual({ width: 4000, height: 3000, bytes: before });
    expect(out.after.width).toBe(2560);
    expect(out.after.bytes).toBeLessThan(before);
    expect(world.ops).toEqual(['download:user-1/bio-1/m1-vecchia.jpg']);
    expect(bucket()).toEqual(['user-1/bio-1/m1-vecchia.jpg']);
    expect(world.rows.get('m1')).toMatchObject({ file_url: row.file_url });
  });
});

describe('recompressPhotoRow: con --apply', () => {
  it('scrive il file nuovo, lo rilegge, aggiorna la riga e solo alla fine cancella il vecchio, in questo ordine', async () => {
    const original = await photoWithNoise(4000, 3000);
    const row = addPhoto('m1', original);
    const out = await recompressPhotoRow(deps(), row, { apply: true });

    expect(out.status).toBe('recompressed');
    if (out.status !== 'recompressed') return;
    const kinds = world.ops.map((o) => o.split(':')[0]);
    expect(kinds).toEqual(['download', 'upload', 'download', 'update', 'readRow', 'refs', 'remove']);
    expect(world.ops[1]).toBe(`upload:${out.newPath}`);
    expect(world.ops[2]).toBe(`download:${out.newPath}`);
    expect(world.ops[6]).toBe('remove:user-1/bio-1/m1-vecchia.jpg');

    expect(out.newPath).toMatch(/^user-1\/bio-1\/\d+-[a-z0-9]+\.jpg$/);
    expect(bucket()).toEqual([out.newPath]); // il vecchio non c'è più
    const saved = await inspectPhoto(world.files.get(out.newPath)!);
    expect(saved).toMatchObject({ format: 'jpeg', width: 2560, height: 1920, hasMetadata: false });
    expect(world.rows.get('m1')).toMatchObject({
      file_url: `${URL_BASE}${out.newPath}`,
      width: 2560,
      height: 1920,
      bytes: out.after.bytes,
      original_bytes: original.length,
    });
    expect(out.oldRemoved).toBe(true);
  });

  it('si può ripetere senza danni: la seconda volta la foto è già elaborata e non si tocca', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    expect((await recompressPhotoRow(deps(), row, { apply: true })).status).toBe('recompressed');

    const updated = { ...row, ...(world.rows.get('m1') as Partial<RecompressRow>) } as RecompressRow;
    world.ops.length = 0;
    const filesBefore = bucket();
    const again = await recompressPhotoRow(deps(), updated, { apply: true });
    expect(again).toMatchObject({ status: 'skipped', reason: 'already_processed' });
    expect(world.ops.every((o) => o.startsWith('download:'))).toBe(true); // legge, non scrive
    expect(bucket()).toEqual(filesBefore);
  });

  it('salta una foto già a posto (JPEG senza metadati entro il limite, senza risparmio utile)', async () => {
    const compact = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#777' } })
      .jpeg({ quality: 85, mozjpeg: true, progressive: true }).toBuffer();
    const row = addPhoto('m1', compact);
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out).toMatchObject({ status: 'skipped', reason: 'within_limits' });
    expect(world.ops).toEqual(['download:user-1/bio-1/m1-vecchia.jpg']);
  });

  it('una foto piccola con la posizione GPS nell\'EXIF si ricomprime lo stesso: si tolgono i metadati', async () => {
    const withGps = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#789' } })
      .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '44/1 24/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '8/1 55/1 0/1' } })
      .jpeg({ quality: 85, mozjpeg: true, progressive: true }).toBuffer();
    const row = addPhoto('m1', withGps);
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out.status).toBe('recompressed');
    if (out.status !== 'recompressed') return;
    expect(out.after.width).toBe(800); // senza ingrandire
    expect((await inspectPhoto(world.files.get(out.newPath)!)).hasExif).toBe(false);
  });

  it('un PNG diventa JPEG, e una copertina scende a 3100 pixel e non a 2560', async () => {
    const png = await sharp({ create: { width: 5000, height: 3000, channels: 3, background: '#468' } }).png().toBuffer();
    const row = addPhoto('m1', png, { layout: 'cover', file_name: 'copertina.png' });
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out.status).toBe('recompressed');
    if (out.status !== 'recompressed') return;
    expect(out.after).toMatchObject({ width: 3100, height: 1860 });
    expect((await inspectPhoto(world.files.get(out.newPath)!)).format).toBe('jpeg');
  });

  it('conserva l\'original_bytes già scritto, senza sovrascriverlo', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000), { original_bytes: 9_999_999 });
    await recompressPhotoRow(deps(), row, { apply: true });
    expect(world.rows.get('m1')).toMatchObject({ original_bytes: 9_999_999 });
  });
});

describe('recompressPhotoRow: se qualcosa va storto il file vecchio resta e la riga non cambia', () => {
  const untouched = (row: RecompressRow) => {
    expect(bucket()).toEqual([storagePathFromFileUrl(row.file_url)]);
    expect(world.rows.get(row.id)).toMatchObject({ file_url: row.file_url });
  };

  it('scrittura del file nuovo rifiutata', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    world.failUpload = true;
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out).toMatchObject({ status: 'error', step: 'upload' });
    untouched(row);
    expect(world.ops.some((o) => o.startsWith('remove:'))).toBe(false);
  });

  it('il file nuovo non si rilegge come atteso: lo toglie e non tocca la riga né il vecchio', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    world.corruptUpload = true;
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out).toMatchObject({ status: 'error', step: 'verify' });
    untouched(row);
    expect(world.ops.filter((o) => o.startsWith('update:'))).toHaveLength(0);
    expect(world.ops.filter((o) => o.startsWith('remove:'))).toHaveLength(1); // solo il file nuovo
  });

  it('aggiornamento della riga rifiutato: toglie il file nuovo, il vecchio resta', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    world.failUpdate = true;
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out).toMatchObject({ status: 'error', step: 'update' });
    untouched(row);
  });

  it('la riga riletta non si capisce dove punti: il vecchio resta e il nuovo si lascia, meglio un file in più che una foto rotta', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    world.badReadBack = true;
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out).toMatchObject({ status: 'error', step: 'update' });
    expect(world.files.has(storagePathFromFileUrl(row.file_url))).toBe(true);
    expect(bucket()).toHaveLength(2);
    expect(world.ops.some((o) => o.startsWith('remove:'))).toBe(false);
  });

  it('l\'aggiornamento è riuscito ma la rilettura cade una volta: rimette la riga com\'era e solo allora toglie il file nuovo', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    // La prima rilettura (subito dopo l'aggiornamento) fallisce; la seconda, dopo il ripristino, funziona.
    world.readNull = 1;
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out).toMatchObject({ status: 'error', step: 'update' });
    untouched(row);
    expect(world.rows.get('m1')).toMatchObject({ file_url: row.file_url });
    const updates = world.ops.filter((o) => o.startsWith('update:'));
    expect(updates).toHaveLength(2); // l'aggiornamento e il ripristino
    expect(world.ops.filter((o) => o.startsWith('remove:'))).toHaveLength(1); // solo il file nuovo
  });

  it('se è la cancellazione del vecchio a fallire, la riga punta già al nuovo: nessun dato perso, solo un file in più', async () => {
    const row = addPhoto('m1', await photoWithNoise(4000, 3000));
    world.failRemove = true;
    const out = await recompressPhotoRow(deps(), row, { apply: true });
    expect(out).toMatchObject({ status: 'recompressed', oldRemoved: false, oldKept: 'remove_failed' });
    expect(bucket()).toHaveLength(2);
    expect(String(world.rows.get('m1')?.file_url)).not.toBe(row.file_url);
  });

  it('copertina su due righe (cover e cover_a5) con lo stesso file: il vecchio si cancella solo quando nessuna riga lo usa più', async () => {
    const cover = addPhoto('c1', await photoWithNoise(4000, 3000), { layout: 'cover' });
    const oldPath = storagePathFromFileUrl(cover.file_url);
    // la seconda riga punta allo stesso file
    const a5: RecompressRow = { ...cover, id: 'c2', layout: 'cover_a5' };
    world.rows.set('c2', { ...a5 });

    const first = await recompressPhotoRow(deps(), cover, { apply: true });
    expect(first).toMatchObject({ status: 'recompressed', oldRemoved: false, oldKept: 'shared' });
    expect(world.files.has(oldPath)).toBe(true); // la seconda riga lo usa ancora
    expect(await deps().readRow('c2')).toMatchObject({ file_url: a5.file_url });

    const second = await recompressPhotoRow(deps(), a5, { apply: true });
    expect(second).toMatchObject({ status: 'recompressed', oldRemoved: true });
    expect(world.files.has(oldPath)).toBe(false);
    expect(bucket()).toHaveLength(2); // un file nuovo per ciascuna riga, nessuno rotto
    for (const id of ['c1', 'c2']) {
      expect(world.files.has(storagePathFromFileUrl(String(world.rows.get(id)?.file_url)))).toBe(true);
    }
  });

  it('file mancante nel bucket o non leggibile come immagine: errore, nessuna scrittura', async () => {
    const missing: RecompressRow = { id: 'm9', biography_id: 'bio-1', user_id: 'user-1', file_url: `${URL_BASE}user-1/bio-1/non-c-e.jpg`, file_name: null, layout: 'full-page' };
    expect(await recompressPhotoRow(deps(), missing, { apply: true })).toMatchObject({ status: 'error', step: 'download' });

    const row = addPhoto('m2', Buffer.from('non è un\'immagine'));
    expect(await recompressPhotoRow(deps(), row, { apply: true })).toMatchObject({ status: 'error', step: 'process' });
    expect(world.ops.filter((o) => o.startsWith('upload:') || o.startsWith('update:') || o.startsWith('remove:'))).toHaveLength(0);
  });
});

describe('summarize', () => {
  it('somma peso prima e dopo, e conta ogni esito', () => {
    const f = (bytes: number) => ({ width: 1, height: 1, bytes });
    const totals = summarize([
      { status: 'would_recompress', before: f(1000), after: f(400), hadMetadata: true },
      { status: 'recompressed', before: f(2000), after: f(500), oldPath: 'a', newPath: 'b', oldRemoved: true },
      { status: 'skipped', reason: 'already_processed', before: f(300) },
      { status: 'skipped', reason: 'within_limits', before: f(200) },
      { status: 'error', step: 'download', message: 'x' },
      { status: 'error', step: 'update', message: 'y', before: f(100) },
    ]);
    expect(totals).toEqual({
      files: 6,
      skippedProcessed: 1,
      skippedWithinLimits: 1,
      recompressed: 1,
      wouldRecompress: 1,
      errors: 2,
      bytesBefore: 1000 + 2000 + 300 + 200 + 100,
      bytesAfter: 400 + 500 + 300 + 200 + 100,
    });
  });
});
