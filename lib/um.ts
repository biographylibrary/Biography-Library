/**
 * Notazione dell'Anno della Memoria Universale (UM) e conteggio continuo dei giorni.
 * Unica fonte di verità in tutta l'applicazione: nessun altro file calcola l'anno UM.
 *
 * L'anno 0 UM è il 2026 gregoriano. Il cambio d'anno è in UTC (specifica UM §3):
 * non dipende dal fuso del luogo di emissione né dall'ora legale.
 */

import {
  UM_EPOCH_YEAR,
  formatUmYear,
  umYear,
  umYearFromDate,
} from '../shared/email/um-year';

export { UM_EPOCH_YEAR, formatUmYear, umYear, umYearFromDate };

/**
 * Numero di giorno giuliano per una data gregoriana.
 * Conteggio continuo di giorni, indipendente da qualunque calendario.
 * Vettori di prova: 1900-01-01 = 2415021, 1948-03-14 = 2432625,
 * 1970-01-01 = 2440588, 2000-01-01 = 2451545,
 * 2026-09-03 = 2461287, 2027-01-01 = 2461407.
 */
export function toJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function fromJDN(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

/**
 * Unisce calendario convenzionale e anno UM. `yearWord` è già tradotto
 * (Anno / Year / An / Jahr) così il modulo non importa i18n.
 * Esempio IT giorno: "3 settembre 2026 (Anno 0 UM)".
 */
export function formatDateWithUmYear(
  iso: string,
  locale: string,
  granularity: 'day' | 'month' | 'year',
  yearWord: string
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Data ISO non valida: ${iso}`);
  }
  const options: Intl.DateTimeFormatOptions =
    granularity === 'day'
      ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
      : granularity === 'month'
        ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
        : { year: 'numeric', timeZone: 'UTC' };
  const conventional = new Intl.DateTimeFormat(locale, options).format(d);
  const um = umYearFromDate(d);
  return `${conventional} (${yearWord} ${formatUmYear(um, 'short')})`;
}
