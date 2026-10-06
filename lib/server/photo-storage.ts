/** Il bucket delle foto di galleria e di copertina. NON è `archive`: i pacchetti d'archivio sono sigillati. */
export const PHOTO_BUCKET = 'biography-photos';

/** Percorso nel bucket ricavato dall'indirizzo salvato in `biography_media.file_url`. */
export function storagePathFromFileUrl(fileUrl: string): string {
  try {
    const parts = new URL(fileUrl).pathname.split(`/${PHOTO_BUCKET}/`);
    if (parts[1]) return decodeURIComponent(parts[1]);
  } catch {
    /* non è un indirizzo: si usa com'è, come faceva il codice di prima */
  }
  return fileUrl;
}
