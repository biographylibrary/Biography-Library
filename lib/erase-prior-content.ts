/**
 * Quale versione precedente cancellare, e il testo da dire al segnalante.
 * Le copie già scaricate non si possono ritirare: va detto, non taciuto.
 */

export type StoredVersion = {
  version: number;
  status: 'stored' | 'destroyed';
};

export function versionToErase(versions: StoredVersion[]): number | null {
  const stored = versions
    .filter((row) => row.status === 'stored')
    .map((row) => row.version)
    .sort((a, b) => a - b);
  if (stored.length === 0) return null;
  if (stored.length === 1) return stored[0];
  return stored[stored.length - 2];
}

const NOTICE: Record<string, { erased: string; copies: string; cache: string }> = {
  it: {
    erased: 'È stato tolto il testo precedente da questi posti',
    copies:
      'Le copie già scaricate da chi ha letto o scritto la scheda non si possono ritirare.',
    cache:
      'È stata registrata la richiesta di togliere l’indirizzo della scheda dalla cache dei motori di ricerca. L’esito presso i motori non è ancora confermato.',
  },
  en: {
    erased: 'The previous text was removed from these places',
    copies:
      'Copies already downloaded by readers or the author cannot be taken back.',
    cache:
      'A request to remove this record’s address from search-engine caches has been recorded. The outcome at the search engines is not confirmed yet.',
  },
  fr: {
    erased: 'Le texte précédent a été retiré de ces endroits',
    copies:
      'Les copies déjà téléchargées par les lecteurs ou l’auteur ne peuvent pas être reprises.',
    cache:
      'La demande de retirer l’adresse de cette fiche du cache des moteurs de recherche est enregistrée. Le résultat auprès des moteurs n’est pas encore confirmé.',
  },
  de: {
    erased: 'Der frühere Text wurde an diesen Stellen entfernt',
    copies:
      'Bereits heruntergeladene Kopien von Lesern oder der Autorin oder dem Autor können nicht zurückgeholt werden.',
    cache:
      'Der Antrag, die Adresse dieser Akte aus dem Cache der Suchmaschinen zu entfernen, ist vermerkt. Das Ergebnis bei den Suchmaschinen ist noch nicht bestätigt.',
  },
};

export function eraseNotice(lang: string | null | undefined, removed: string[]): string {
  const copy = NOTICE[lang || 'en'] ?? NOTICE.en;
  return `${copy.erased}: ${removed.join(', ')}.\n\n${copy.copies}\n\n${copy.cache}`;
}
