import {
  inspectPhoto,
  maxSideFor,
  photoStoragePath,
  processPhoto,
  type PhotoInspection,
  type PhotoKind,
} from '@/lib/server/photo-processing';
import { storagePathFromFileUrl } from '@/lib/server/photo-storage';

/**
 * Ricompressione delle foto già caricate nel bucket `biography-photos` (script
 * scripts/recompress-photos.ts), con le stesse regole del server (lib/server/photo-processing.ts).
 *
 * Regole di sicurezza, nell'ordine in cui si applicano a ogni foto:
 *   1. si scrive il file nuovo con un percorso nuovo, mai sopra quello vecchio;
 *   2. si rilegge il file nuovo dal bucket e si controlla che sia quello atteso;
 *   3. si aggiorna la riga di `biography_media` e si controlla che punti al file nuovo;
 *   4. solo dopo si cancella il file vecchio.
 * Se un passo fallisce si toglie il file nuovo e il vecchio resta dov'è, con la riga com'era: si può
 * ripetere senza danni. Una foto già elaborata (dal server o da un'esecuzione precedente) si salta.
 */

export interface RecompressRow {
  id: string;
  biography_id: string;
  user_id: string;
  file_url: string;
  file_name: string | null;
  layout: string;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  original_bytes?: number | null;
}

export interface RecompressDeps {
  /** Scarica un file dal bucket; null se non c'è. */
  download(path: string): Promise<Buffer | null>;
  upload(path: string, data: Buffer): Promise<{ error: string | null }>;
  remove(paths: string[]): Promise<{ error: string | null }>;
  publicUrl(path: string): string;
  updateRow(id: string, patch: Record<string, unknown>): Promise<{ error: string | null }>;
  /** Rilegge la riga dal database. */
  readRow(id: string): Promise<{ file_url: string; bytes: number | null } | null>;
  /**
   * Quante altre righe (oltre a `exceptId`) puntano ancora a questo file. Le copertine `cover` e
   * `cover_a5` sono due righe sullo stesso file: il file vecchio si cancella solo quando nessuna
   * riga lo usa più.
   */
  countOtherReferences(path: string, exceptId: string): Promise<number>;
}

export interface PhotoFacts {
  width: number;
  height: number;
  bytes: number;
}

export type SkipReason = 'already_processed' | 'within_limits';
export type FailedStep = 'download' | 'process' | 'upload' | 'verify' | 'update';

export type RecompressOutcome =
  | { status: 'skipped'; reason: SkipReason; before: PhotoFacts }
  | { status: 'would_recompress'; before: PhotoFacts; after: PhotoFacts; hadMetadata: boolean }
  | {
      status: 'recompressed';
      before: PhotoFacts;
      after: PhotoFacts;
      oldPath: string;
      newPath: string;
      oldRemoved: boolean;
      /** Perché il file vecchio è rimasto: usato ancora da un'altra riga, o cancellazione fallita. */
      oldKept?: 'shared' | 'remove_failed';
    }
  | { status: 'error'; step: FailedStep; message: string; before?: PhotoFacts };

export const KIND_OF_LAYOUT = (layout: string): PhotoKind => (layout === 'cover' || layout === 'cover_a5' ? 'cover' : 'gallery');

/** Sotto questa frazione del peso attuale la ricompressione vale la pena; oltre, è solo perdita di qualità. */
export const MIN_USEFUL_SAVING = 0.1;

/**
 * Una foto si salta se è già stata elaborata dal server, oppure se è già un JPEG senza metadati, con
 * il lato lungo entro il limite e senza un risparmio utile: ricomprimerla di nuovo la peggiorerebbe
 * (perdita di generazione) senza guadagnare spazio.
 */
export function decideRecompression(input: {
  processedByServer: boolean;
  inspection: PhotoInspection;
  estimatedBytes: number;
  kind: PhotoKind;
}): { action: 'recompress' } | { action: 'skip'; reason: SkipReason } {
  if (input.processedByServer) return { action: 'skip', reason: 'already_processed' };
  const { inspection } = input;
  const withinSide = Math.max(inspection.width, inspection.height) <= maxSideFor(input.kind);
  const noGain = input.estimatedBytes >= inspection.bytes * (1 - MIN_USEFUL_SAVING);
  if (inspection.format === 'jpeg' && !inspection.hasMetadata && withinSide && noGain) {
    return { action: 'skip', reason: 'within_limits' };
  }
  return { action: 'recompress' };
}

const facts = (i: { width: number; height: number; bytes: number }): PhotoFacts => ({ width: i.width, height: i.height, bytes: i.bytes });

export async function recompressPhotoRow(
  deps: RecompressDeps,
  row: RecompressRow,
  opts: { apply: boolean }
): Promise<RecompressOutcome> {
  const oldPath = storagePathFromFileUrl(row.file_url);

  const original = await deps.download(oldPath).catch(() => null);
  if (!original) return { status: 'error', step: 'download', message: `file non trovato nel bucket: ${oldPath}` };

  let inspection: PhotoInspection;
  let processed;
  const kind = KIND_OF_LAYOUT(row.layout);
  try {
    inspection = await inspectPhoto(original);
    processed = await processPhoto(original, kind);
  } catch (err) {
    return { status: 'error', step: 'process', message: err instanceof Error ? err.message : String(err) };
  }
  const before = facts(inspection);

  const decision = decideRecompression({
    processedByServer: row.bytes != null && row.width != null,
    inspection,
    estimatedBytes: processed.bytes,
    kind,
  });
  if (decision.action === 'skip') return { status: 'skipped', reason: decision.reason, before };

  const after = facts(processed);
  if (!opts.apply) return { status: 'would_recompress', before, after, hadMetadata: inspection.hasMetadata };

  // 1. file nuovo, percorso nuovo
  const newPath = photoStoragePath(row.user_id, row.biography_id);
  const up = await deps.upload(newPath, processed.data);
  if (up.error) return { status: 'error', step: 'upload', message: up.error, before };

  const undo = async () => {
    await deps.remove([newPath]).catch(() => undefined);
  };

  // 2. il file nuovo si legge ed è quello atteso
  const reread = await deps.download(newPath).catch(() => null);
  let verified = false;
  if (reread) {
    try {
      const check = await inspectPhoto(reread);
      verified =
        check.format === 'jpeg' &&
        check.width === processed.width &&
        check.height === processed.height &&
        reread.length === processed.bytes &&
        !check.hasMetadata;
    } catch {
      verified = false;
    }
  }
  if (!verified) {
    await undo();
    return { status: 'error', step: 'verify', message: 'il file nuovo non si rilegge come atteso', before };
  }

  // 3. la riga punta al file nuovo
  const newUrl = deps.publicUrl(newPath);
  const upd = await deps.updateRow(row.id, {
    file_url: newUrl,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    original_bytes: row.original_bytes ?? original.length,
  }).catch((err: unknown) => ({ error: err instanceof Error ? err.message : String(err) }));
  // Si controlla sempre dove punta la riga, anche se l'aggiornamento ha dato errore: un timeout può
  // nascondere un aggiornamento in realtà riuscito, e cancellare il file nuovo lascerebbe una foto rotta.
  const back = await deps.readRow(row.id).catch(() => null);
  if (!upd.error && back && back.file_url === newUrl && back.bytes === processed.bytes) {
    // 4. solo ora il file vecchio, e solo se nessun'altra riga lo usa (se il conteggio non si legge,
    // si presume di sì: un file in più è meno grave di una foto rotta)
    const others = await deps.countOtherReferences(oldPath, row.id).catch(() => 1);
    if (others > 0) {
      return { status: 'recompressed', before, after, oldPath, newPath, oldRemoved: false, oldKept: 'shared' };
    }
    const removed = await deps.remove([oldPath]).catch(() => ({ error: 'remove failed' }));
    return {
      status: 'recompressed',
      before,
      after,
      oldPath,
      newPath,
      oldRemoved: !removed.error,
      ...(removed.error ? { oldKept: 'remove_failed' as const } : {}),
    };
  }

  let rowIsOnOldFile = back?.file_url === row.file_url;
  if (!rowIsOnOldFile) {
    // La riga punta al file nuovo, o non si sa: la si rimette com'era e si controlla.
    await deps
      .updateRow(row.id, {
        file_url: row.file_url,
        width: row.width ?? null,
        height: row.height ?? null,
        bytes: row.bytes ?? null,
        original_bytes: row.original_bytes ?? null,
      })
      .catch(() => undefined);
    const restored = await deps.readRow(row.id).catch(() => null);
    rowIsOnOldFile = restored?.file_url === row.file_url;
  }
  const message = upd.error ?? 'la riga non punta al file nuovo';
  if (rowIsOnOldFile) {
    await undo();
    return { status: 'error', step: 'update', message, before };
  }
  // Stato incerto: meglio un file in più nel bucket che una riga che punta a un file cancellato.
  return { status: 'error', step: 'update', message: `${message}. Stato della riga incerto: il file nuovo ${newPath} è stato lasciato nel bucket`, before };
}

export interface RecompressTotals {
  files: number;
  skippedProcessed: number;
  skippedWithinLimits: number;
  recompressed: number;
  wouldRecompress: number;
  errors: number;
  /** Peso di tutte le foto lette (quelle con errore di lettura non contano). */
  bytesBefore: number;
  /** Peso dopo: la stima in simulazione, il peso vero dopo `--apply`. */
  bytesAfter: number;
}

export function summarize(outcomes: RecompressOutcome[]): RecompressTotals {
  const totals: RecompressTotals = {
    files: outcomes.length,
    skippedProcessed: 0,
    skippedWithinLimits: 0,
    recompressed: 0,
    wouldRecompress: 0,
    errors: 0,
    bytesBefore: 0,
    bytesAfter: 0,
  };
  for (const o of outcomes) {
    if (o.status === 'error') {
      totals.errors += 1;
      if (o.before) {
        totals.bytesBefore += o.before.bytes;
        totals.bytesAfter += o.before.bytes;
      }
      continue;
    }
    totals.bytesBefore += o.before.bytes;
    if (o.status === 'skipped') {
      if (o.reason === 'already_processed') totals.skippedProcessed += 1;
      else totals.skippedWithinLimits += 1;
      totals.bytesAfter += o.before.bytes;
    } else {
      if (o.status === 'recompressed') totals.recompressed += 1;
      else totals.wouldRecompress += 1;
      totals.bytesAfter += o.after.bytes;
    }
  }
  return totals;
}
