/**
 * Indirizzo canonico di risoluzione degli identificativi UM (specifica §9).
 *
 * Server-only di proposito: niente prefisso `NEXT_PUBLIC_`, così il valore non
 * viene incorporato nel pacchetto JavaScript durante `next build`. Una
 * correzione costa un riavvio del contenitore, non un'immagine nuova. Chi gira
 * nel browser ottiene lo stesso valore da `GET /api/um-id/base-url`.
 *
 * Fallisce se la variabile manca, invece di ripiegare su un valore predefinito.
 * Questo indirizzo finisce dentro export di testo e PDF che vengono depositati
 * come file statici: una copia già scaricata non si corregge più, e un
 * indirizzo sbagliato in un documento permanente è peggio di un errore visibile
 * al momento della generazione.
 */
export function umIdBaseUrl(): string {
  const raw = process.env.UM_ID_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      'UM_ID_BASE_URL non impostata. È obbligatoria e non ha valore predefinito: ' +
        "l'indirizzo di risoluzione finisce dentro documenti depositati e non è " +
        'correggibile a posteriori. Valore atteso: https://id.biographylibrary.org'
    );
  }
  return raw.replace(/\/+$/, '');
}

/** Indirizzo completo per un identificativo già in forma canonica. */
export function umIdCanonicalUrl(canonicalUmId: string): string {
  return `${umIdBaseUrl()}/${canonicalUmId}`;
}
