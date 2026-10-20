export const UM_EPOCH_YEAR = 2026;

export function umYear(gregorianYear: number): number {
  return gregorianYear - UM_EPOCH_YEAR;
}

/**
 * Anno UM da un istante, in UTC (specifica §3).
 * Usa getUTCFullYear: mai getFullYear (fuso locale).
 */
export function umYearFromDate(date: Date): number {
  return umYear(date.getUTCFullYear());
}

/**
 * 'short'  -> "0 UM", "1 UM"       per testi, crediti, interfaccia
 * 'padded' -> "0000 UM", "0001 UM"  per metadati, identificativi, export tecnici
 * Lancia su anni negativi salvo allowNegative: la notazione UM vale per gli
 * eventi dell'archivio, mai per le date di vita delle persone.
 */
export function formatUmYear(
  um: number,
  style: 'short' | 'padded' = 'short',
  opts: { allowNegative?: boolean } = {}
): string {
  if (um < 0 && !opts.allowNegative) {
    throw new Error(
      `Anno UM negativo (${um}): la notazione UM vale solo per gli eventi dell'archivio.`
    );
  }
  return style === 'padded'
    ? `${um < 0 ? '-' : ''}${String(Math.abs(um)).padStart(4, '0')} UM`
    : `${um} UM`;
}
