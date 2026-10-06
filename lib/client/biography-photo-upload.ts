import { fetchWithAgentAuth } from '@/lib/auth-token';

/** Dimensione massima del file che il server accetta (vedi lib/server/photo-processing.ts). */
export const PHOTO_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export type PhotoUploadErrorCode =
  | 'file_too_large'
  | 'gallery_limit'
  | 'unsupported_type'
  | 'heic_unsupported'
  | 'corrupt_image'
  | 'too_many_pixels'
  | 'text_locked'
  | 'biography_frozen'
  | 'upload_failed';

export type PhotoUploadResult<Row> =
  | { ok: true; media: Row; medias: Row[] }
  | { ok: false; code: PhotoUploadErrorCode; max?: number };

const KNOWN: readonly PhotoUploadErrorCode[] = [
  'file_too_large',
  'gallery_limit',
  'unsupported_type',
  'heic_unsupported',
  'corrupt_image',
  'too_many_pixels',
  'text_locked',
  'biography_frozen',
];

/**
 * Manda la foto al server (rotta POST /api/biography/[id]/media), che la controlla, la elabora e la
 * scrive nel bucket. Il browser non scrive più direttamente nel bucket. Non lancia: restituisce
 * l'esito, con un codice che il pannello traduce in un messaggio.
 */
export async function uploadBiographyPhoto<Row>(
  biographyId: string,
  file: File,
  /** Un layout di galleria, oppure uno o più layout di copertina (`['cover', 'cover_a5']`: un file, due righe). */
  layout: string | string[]
): Promise<PhotoUploadResult<Row>> {
  const form = new FormData();
  form.set('file', file, file.name);
  form.set('layout', Array.isArray(layout) ? layout.join(',') : layout);

  let res: Response;
  try {
    res = await fetchWithAgentAuth(`/api/biography/${encodeURIComponent(biographyId)}/media`, {
      method: 'POST',
      body: form,
    });
  } catch {
    return { ok: false, code: 'upload_failed' };
  }

  // Un server o un proxy che si trova davanti rifiuta un corpo troppo grande con un 413 senza JSON.
  const body = (await res.json().catch(() => null)) as
    | { error?: string; media?: Row; medias?: Row[]; max?: number }
    | null;

  if (res.ok && body?.media) return { ok: true, media: body.media, medias: body.medias ?? [body.media] };
  if (res.status === 413 && !body?.error) return { ok: false, code: 'file_too_large' };

  const code = KNOWN.find((known) => known === body?.error) ?? 'upload_failed';
  return { ok: false, code, ...(typeof body?.max === 'number' ? { max: body.max } : {}) };
}
