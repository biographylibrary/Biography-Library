import sharp from 'sharp';

/**
 * Elaborazione delle foto di una biografia, sul server, prima di salvarle.
 *
 * Perché questi numeri: il libro è in formato B5, 176 per 250 mm, con abbondanza a 182 per 256 mm.
 * A 300 punti per pollice una copertina a tutta pagina richiede circa 2150 per 3024 pixel, e una
 * foto di galleria a tutta pagina dentro i margini circa 1665 per 2540. Il lato lungo massimo è
 * quindi 2560 pixel per la galleria e 3100 per le copertine (`cover` e `cover_a5`), mai
 * ingrandendo: una foto più piccola resta com'è. Il file elaborato sostituisce quello di
 * partenza, che non viene conservato.
 */

/** Dimensione massima del file in ingresso: chi carica dal telefono non deve rimpicciolire da sé. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const GALLERY_MAX_SIDE_PX = 2560;
export const COVER_MAX_SIDE_PX = 3100;
export const JPEG_QUALITY = 85;

/**
 * Tetto ai pixel decodificati: un file piccolo può contenere un'immagine enorme (bomba di
 * decompressione) e occupare gigabyte di memoria. 150 milioni di pixel sono più di una fotocamera
 * da 100 megapixel.
 */
export const MAX_INPUT_PIXELS = 150_000_000;

export type PhotoKind = 'gallery' | 'cover';
export type DetectedImageType = 'jpeg' | 'png' | 'webp' | 'heic';

export type PhotoErrorCode = 'unsupported_type' | 'heic_unsupported' | 'corrupt_image' | 'too_many_pixels';

export class PhotoError extends Error {
  constructor(
    public readonly code: PhotoErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'PhotoError';
  }
}

export interface ProcessedPhoto {
  /** JPEG pronto da salvare. */
  data: Buffer;
  width: number;
  height: number;
  /** Dimensione del file elaborato. */
  bytes: number;
  /** Dimensione del file di partenza. */
  originalBytes: number;
  inputType: DetectedImageType;
}

export function maxSideFor(kind: PhotoKind): number {
  return kind === 'cover' ? COVER_MAX_SIDE_PX : GALLERY_MAX_SIDE_PX;
}

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

/**
 * Riconosce il tipo dal contenuto del file (i primi byte), non dall'estensione né dal tipo che
 * dichiara il browser: un file «.jpg» che è un'altra cosa non passa. AVIF e GIF non sono accettati.
 */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'png';
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(bytes.slice(from, to)));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  if (bytes.length >= 12 && ascii(4, 8) === 'ftyp' && HEIC_BRANDS.has(ascii(8, 12))) return 'heic';
  return null;
}

/**
 * Applica l'orientamento EXIF, converte in sRGB, toglie tutti i metadati (posizione GPS compresa),
 * appiattisce su bianco la trasparenza, riduce il lato lungo al massimo (mai ingrandendo) e salva
 * in JPEG con mozjpeg, qualità 85, progressivo.
 */
export async function processPhoto(input: Buffer, kind: PhotoKind): Promise<ProcessedPhoto> {
  const inputType = detectImageType(input);
  if (!inputType) {
    throw new PhotoError('unsupported_type', 'Il file non è un\'immagine JPEG, PNG o WebP.');
  }

  const max = maxSideFor(kind);
  try {
    const { data, info } = await sharp(input, { failOn: 'truncated', limitInputPixels: MAX_INPUT_PIXELS })
      // Orientamento EXIF: va applicato ai pixel prima di togliere i metadati, o la foto resta di lato.
      .rotate()
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
      .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      // Nessuna chiamata a withMetadata(): sharp toglie EXIF, XMP, IPTC, GPS e il profilo colore.
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
      .toBuffer({ resolveWithObject: true });

    return {
      data,
      width: info.width,
      height: info.height,
      bytes: data.length,
      originalBytes: input.length,
      inputType,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/pixel limit/i.test(message)) {
      throw new PhotoError('too_many_pixels', 'L\'immagine ha troppi pixel.');
    }
    if (inputType === 'heic') {
      // La versione di sharp con libheif precompilata decodifica solo AV1 (AVIF), non HEVC (HEIC).
      throw new PhotoError('heic_unsupported', 'Le foto HEIC non sono supportate: salvala come JPEG.');
    }
    throw new PhotoError('corrupt_image', 'Il file è danneggiato o non si legge come immagine.');
  }
}

export interface PhotoInspection {
  format: string | undefined;
  width: number;
  height: number;
  bytes: number;
  /** Vero se ci sono EXIF, XMP, IPTC o un profilo colore incorporato. */
  hasMetadata: boolean;
  hasExif: boolean;
  hasAlpha: boolean;
}

/** Legge le caratteristiche di una foto già salvata (la usano lo script di ricompressione e i test). */
export async function inspectPhoto(input: Buffer): Promise<PhotoInspection> {
  const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  // `orientation` fa parte dei metadati: dopo l'elaborazione non deve più esserci.
  const rotated = (meta.orientation ?? 1) > 1;
  const swap = rotated && (meta.orientation ?? 1) >= 5;
  return {
    format: meta.format,
    width: swap ? (meta.height ?? 0) : (meta.width ?? 0),
    height: swap ? (meta.width ?? 0) : (meta.height ?? 0),
    bytes: input.length,
    hasExif: Boolean(meta.exif),
    hasMetadata: Boolean(meta.exif || meta.xmp || meta.iptc || meta.icc || meta.tifftagPhotoshop || rotated),
    hasAlpha: Boolean(meta.hasAlpha),
  };
}

/** Percorso nel bucket, nello stesso schema di prima: utente, biografia, nome unico. Sempre `.jpg`. */
export function photoStoragePath(userId: string, biographyId: string): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${biographyId}/${unique}.jpg`;
}
