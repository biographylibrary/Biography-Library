/**
 * @deprecated Le bozze PDF non lanciano più l'AI. Usare:
 * - `POST /api/publication/record-pdf-draft` dopo ogni scarico filigranato
 * - `POST /api/publication/preprint-check` per il controllo finale a richiesta
 *
 * Questa rotta resta solo come alias di `record-pdf-draft` per client vecchi.
 */
export { POST } from '@/app/api/publication/record-pdf-draft/route';
