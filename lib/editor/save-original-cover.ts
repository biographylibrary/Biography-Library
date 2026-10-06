import { uploadBiographyPhoto } from '@/lib/client/biography-photo-upload';

/**
 * Salva la copertina preparata (la prima pagina di un PDF importato) in modo che la scheda del
 * catalogo e la prima pagina del PDF mostrino la stessa immagine: un solo file, usato sia dalla
 * riga `cover` sia dalla riga `cover_a5`, che sostituiscono quelle di prima.
 *
 * Passa dal server (rotta POST /api/biography/[id]/media), che controlla, elabora e scrive: il
 * browser non scrive più direttamente nel bucket delle foto.
 */
export async function saveOriginalCoverJpeg(opts: {
  biographyId: string;
  userId?: string;
  jpegBase64: string;
}): Promise<void> {
  const binary = atob(opts.jpegBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const file = new File([bytes], 'original-cover.jpg', { type: 'image/jpeg' });

  const result = await uploadBiographyPhoto(opts.biographyId, file, ['cover', 'cover_a5']);
  if (!result.ok) throw new Error(`cover upload failed: ${result.code}`);
}
