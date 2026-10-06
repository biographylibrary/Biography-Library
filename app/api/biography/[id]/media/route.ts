import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { buildServiceClient } from '@/lib/server/service-client';
import { resolveBiographyId } from '@/lib/server/biography-view-access';
import { buildMediaInsertPayload } from '@/lib/editor/write-payloads';
import { MAX_BIOGRAPHY_GALLERY_PHOTOS } from '@/lib/biography-media-constants';
import { canAuthorWriteText } from '@/lib/publication-state';
import { PHOTO_BUCKET, storagePathFromFileUrl } from '@/lib/server/photo-storage';
import {
  MAX_UPLOAD_BYTES,
  PhotoError,
  photoStoragePath,
  processPhoto,
  type PhotoKind,
} from '@/lib/server/photo-processing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = PHOTO_BUCKET;
const GALLERY_LAYOUTS = ['full-page', 'two-vertical', 'two-horizontal', 'three-mixed'] as const;
const COVER_LAYOUTS = ['cover', 'cover_a5'] as const;
/** Margine per i campi del modulo e la separazione delle parti, oltre al file. */
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/**
 * Carica una foto di galleria o di copertina: il browser manda il file qui, e il server lo
 * controlla, lo elabora (vedi `lib/server/photo-processing.ts`) e lo scrive nel bucket con il ruolo
 * di servizio. Il file elaborato sostituisce quello di partenza, che non viene conservato.
 *
 * Accesso con le stesse regole delle policy RLS sulle foto: il proprietario della biografia, con
 * account attivo e biografia non congelata. Le foto fanno parte di ciò che l'autore può scrivere
 * solo negli stati di lavoro (il trigger a01_ delle tabelle figlie non ferma il ruolo di servizio,
 * quindi lo stato si controlla qui, con lo stesso elenco).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user.id;

  // Un file dichiarato troppo grande si rifiuta prima di leggere il corpo.
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return fail(413, 'file_too_large', { maxBytes: MAX_UPLOAD_BYTES });
  }

  const service = buildServiceClient();
  const biographyId = await resolveBiographyId(service, params.id);
  if (!biographyId) return fail(404, 'not_found');

  const [{ data: profile }, { data: bio }] = await Promise.all([
    service.from('profiles').select('account_status').eq('id', userId).maybeSingle(),
    service.from('biographies').select('user_id, status, is_frozen').eq('id', biographyId).maybeSingle(),
  ]);
  if (!bio) return fail(404, 'not_found');

  const bioRow = bio as { user_id: string; status: string | null; is_frozen: boolean | null };
  if (bioRow.user_id !== userId) return fail(403, 'forbidden');
  if ((profile as { account_status?: string } | null)?.account_status !== 'active') {
    return fail(403, 'account_not_active');
  }
  if (bioRow.is_frozen) return fail(403, 'biography_frozen');
  if (!canAuthorWriteText(bioRow.status, bioRow.is_frozen)) return fail(409, 'text_locked');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'invalid_form');
  }

  const file = form.get('file');
  if (!file || typeof file === 'string' || typeof (file as Blob).arrayBuffer !== 'function') {
    return fail(400, 'file_missing');
  }

  // Un layout di galleria, oppure uno o più layout di copertina separati da virgola («cover,cover_a5»):
  // l'immagine si elabora e si salva una volta sola, e ogni layout ottiene la sua riga che la usa.
  const layoutField = form.get('layout');
  const layouts = Array.from(
    new Set(
      (typeof layoutField === 'string' && layoutField ? layoutField : 'full-page')
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)
    )
  );
  const isCover = layouts.length > 0 && layouts.every((l) => (COVER_LAYOUTS as readonly string[]).includes(l));
  const isGallery =
    layouts.length === 1 && (GALLERY_LAYOUTS as readonly string[]).includes(layouts[0]);
  if (!isCover && !isGallery) {
    return fail(400, 'invalid_layout');
  }
  const kind: PhotoKind = isCover ? 'cover' : 'gallery';

  if ((file as Blob).size > MAX_UPLOAD_BYTES) {
    return fail(413, 'file_too_large', { maxBytes: MAX_UPLOAD_BYTES });
  }

  // Galleria: al massimo MAX_BIOGRAPHY_GALLERY_PHOTOS, copertine escluse.
  let displayOrder = 0;
  if (!isCover) {
    const { data: rows } = await service
      .from('biography_media')
      .select('display_order')
      .eq('biography_id', biographyId)
      .not('layout', 'in', '(cover,cover_a5)');
    const gallery = (rows as { display_order: number | null }[] | null) ?? [];
    if (gallery.length >= MAX_BIOGRAPHY_GALLERY_PHOTOS) {
      return fail(409, 'gallery_limit', { max: MAX_BIOGRAPHY_GALLERY_PHOTOS });
    }
    displayOrder = gallery.length ? Math.max(...gallery.map((r) => r.display_order ?? 0)) + 1 : 0;
  }

  const original = Buffer.from(await (file as Blob).arrayBuffer());

  let processed;
  try {
    processed = await processPhoto(original, kind);
  } catch (err) {
    if (err instanceof PhotoError) {
      if (err.code === 'unsupported_type') return fail(415, 'unsupported_type');
      if (err.code === 'heic_unsupported') return fail(415, 'heic_unsupported');
      if (err.code === 'too_many_pixels') return fail(413, 'too_many_pixels');
      return fail(422, 'corrupt_image');
    }
    console.error('[media] elaborazione della foto fallita:', err);
    return fail(500, 'processing_failed');
  }

  const storagePath = photoStoragePath(userId, biographyId);
  const bucket = service.storage.from(BUCKET);

  const { error: uploadError } = await bucket.upload(storagePath, processed.data, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) {
    console.error('[media] scrittura nel bucket fallita:', uploadError.message);
    return fail(502, 'upload_failed');
  }

  // Le copertine (cover, cover_a5) sono una per tipo: si ricordano le righe di prima, e si tolgono
  // solo a caricamento riuscito, a differenza del vecchio flusso che toglieva prima di caricare.
  let previousCovers: { id: string; file_url: string }[] = [];
  if (isCover) {
    const { data } = await service
      .from('biography_media')
      .select('id, file_url')
      .eq('biography_id', biographyId)
      .in('layout', layouts);
    previousCovers = (data as { id: string; file_url: string }[] | null) ?? [];
  }

  const { data: urlData } = bucket.getPublicUrl(storagePath);
  const fileName = (typeof (file as File).name === 'string' ? (file as File).name : 'foto.jpg')
    .replace(/[\\/]/g, '_')
    .slice(0, 200);

  const insertedRows: Record<string, unknown>[] = [];
  let insertError: { message: string } | null = null;
  for (const layout of layouts) {
    const { data, error } = await service
      .from('biography_media')
      .insert(
        buildMediaInsertPayload({
          biographyId,
          userId,
          fileUrl: urlData?.publicUrl ?? storagePath,
          fileName,
          layout,
          displayOrder,
          dimensions: {
            width: processed.width,
            height: processed.height,
            bytes: processed.bytes,
            originalBytes: processed.originalBytes,
          },
        })
      )
      .select()
      .single();
    if (error || !data) {
      insertError = error ?? { message: 'insert returned no row' };
      break;
    }
    insertedRows.push(data as Record<string, unknown>);
  }

  if (insertError) {
    // Tutto o niente: si tolgono le righe già scritte e il file, e le copertine di prima restano dove sono.
    if (insertedRows.length) {
      await service.from('biography_media').delete().in('id', insertedRows.map((r) => r.id));
    }
    await bucket.remove([storagePath]);
    // Il controllo nel database è l'ultima difesa: due caricamenti insieme non superano il limite.
    if (/at most \d+ gallery photos/i.test(insertError.message)) {
      return fail(409, 'gallery_limit', { max: MAX_BIOGRAPHY_GALLERY_PHOTOS });
    }
    console.error('[media] scrittura della riga fallita:', insertError.message);
    return fail(500, 'insert_failed');
  }

  if (previousCovers.length) {
    await service.from('biography_media').delete().in('id', previousCovers.map((c) => c.id));
    await bucket.remove(previousCovers.map((c) => storagePathFromFileUrl(c.file_url)));
  }

  return NextResponse.json({ media: insertedRows[0], medias: insertedRows }, { status: 201 });
}
