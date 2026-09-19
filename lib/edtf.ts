/**
 * Parser EDTF severo — sottoinsieme supportato.
 *
 * Solo queste forme sono accettate; qualunque altra stringa è rifiutata
 * (mai interpretata). Tutto ciò che passa è EDTF valido secondo lo standard
 * Library of Congress / ISO 8601-2:2019, così un passaggio futuro a una
 * libreria completa non richiede migrazioni.
 *
 * Forme accettate:
 *   YYYY                 es. 1948
 *   YYYY-MM              es. 1948-03
 *   YYYY-MM-DD           es. 1948-03-14
 *   YYYY~  YYYY?  YYYY%  incertezza / approssimazione sull'anno
 *   YYYX                 decade: 189X → 1890..1899
 *   YYXX                 secolo: 18XX → 1800..1899
 *   [YYYY..]             non prima di YYYY
 *   [..YYYY]             non dopo YYYY
 *   YYYY/YYYY            intervallo aperto tra due anni
 *
 * Non supportato (rifiutato): mesi/giorni con ~/?/%, seasons, set {},
 * intervalli con mesi/giorni, qualificatori su parti interne, ecc.
 *
 * La forma originale resta in date_as_given: un rifiuto del parser non
 * fa perdere informazione.
 */

export type EdtfBounds = {
  /** Estremo inferiore ISO (YYYY-MM-DD), inclusivo. */
  start: string;
  /** Estremo superiore ISO (YYYY-MM-DD), inclusivo. */
  end: string;
};

const RE_YEAR = /^(\d{4})$/;
const RE_YEAR_MONTH = /^(\d{4})-(\d{2})$/;
const RE_YEAR_MONTH_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_YEAR_QUAL = /^(\d{4})[~?%]$/;
const RE_DECADE = /^(\d{3})X$/;
const RE_CENTURY = /^(\d{2})XX$/;
const RE_ONE_SIDED_START = /^\[(\d{4})\.\.\]$/;
const RE_ONE_SIDED_END = /^\[\.\.(\d{4})\]$/;
const RE_YEAR_RANGE = /^(\d{4})\/(\d{4})$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDay(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

function yearStart(year: number): string {
  return isoDay(year, 1, 1);
}

function yearEnd(year: number): string {
  return isoDay(year, 12, 31);
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

/**
 * Restituisce gli estremi ISO derivati, o null se la stringa non è nel
 * sottoinsieme supportato (rifiuto severo, nessuna interpretazione).
 */
export function parseEdtf(s: string): EdtfBounds | null {
  if (typeof s !== 'string' || s.length === 0) return null;
  const t = s.trim();
  if (t !== s) return null; // spazi esterni: rifiuta

  let m: RegExpExecArray | null;

  m = RE_YEAR_MONTH_DAY.exec(t);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!isValidYmd(y, mo, d)) return null;
    const iso = isoDay(y, mo, d);
    return { start: iso, end: iso };
  }

  m = RE_YEAR_MONTH.exec(t);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (mo < 1 || mo > 12) return null;
    return { start: isoDay(y, mo, 1), end: isoDay(y, mo, daysInMonth(y, mo)) };
  }

  m = RE_YEAR.exec(t);
  if (m) {
    const y = Number(m[1]);
    return { start: yearStart(y), end: yearEnd(y) };
  }

  m = RE_YEAR_QUAL.exec(t);
  if (m) {
    const y = Number(m[1]);
    return { start: yearStart(y), end: yearEnd(y) };
  }

  m = RE_DECADE.exec(t);
  if (m) {
    const base = Number(m[1]) * 10;
    return { start: yearStart(base), end: yearEnd(base + 9) };
  }

  m = RE_CENTURY.exec(t);
  if (m) {
    const base = Number(m[1]) * 100;
    return { start: yearStart(base), end: yearEnd(base + 99) };
  }

  m = RE_ONE_SIDED_START.exec(t);
  if (m) {
    const y = Number(m[1]);
    // Estremo superiore aperto: usiamo un secolo lontano come bound pratico.
    // Il campo date_end_iso resta interpretabile; l'originale è in date_as_given.
    return { start: yearStart(y), end: yearEnd(9999) };
  }

  m = RE_ONE_SIDED_END.exec(t);
  if (m) {
    const y = Number(m[1]);
    return { start: yearStart(1), end: yearEnd(y) };
  }

  m = RE_YEAR_RANGE.exec(t);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > b) return null;
    return { start: yearStart(a), end: yearEnd(b) };
  }

  return null;
}

export function isValidEdtf(s: string): boolean {
  return parseEdtf(s) !== null;
}
