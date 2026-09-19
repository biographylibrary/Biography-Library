/**
 * Interfaccia data → EDTF senza esporre EDTF all'utente.
 * "circa 1893" → 1893~ ; "anni Novanta" → decade; mese sconosciuto → YYYY.
 */

import { parseEdtf } from '@/lib/edtf';

export type DatePrecision =
  | 'unknown'
  | 'day'
  | 'month'
  | 'year'
  | 'approx'
  | 'decade';

export type DateInputState = {
  precision: DatePrecision;
  year: string;
  month: string;
  day: string;
};

export const EMPTY_DATE_INPUT: DateInputState = {
  precision: 'unknown',
  year: '',
  month: '',
  day: '',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseYear(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d{1,4}$/.test(t)) return null;
  const y = Number(t);
  if (y < 1 || y > 9999) return null;
  return y;
}

function parseMonth(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const m = Number(t);
  if (m < 1 || m > 12) return null;
  return m;
}

function parseDay(raw: string, year: number, month: number): number | null {
  const t = raw.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const d = Number(t);
  const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (d < 1 || d > max) return null;
  return d;
}

export type DateInputResult = {
  edtf: string | null;
  asGiven: string | null;
  startIso: string | null;
  endIso: string | null;
};

/**
 * Converte lo stato UI in EDTF + estremi ISO.
 * Se la precisione non è "unknown" ma i campi non bastano, restituisce edtf null
 * (il chiamante può tenere asGiven libero).
 */
export function dateInputToEdtf(state: DateInputState): DateInputResult {
  if (state.precision === 'unknown') {
    return { edtf: null, asGiven: null, startIso: null, endIso: null };
  }

  const year = parseYear(state.year);
  if (year === null) {
    return { edtf: null, asGiven: null, startIso: null, endIso: null };
  }

  const yyyy = String(year).padStart(4, '0');

  if (state.precision === 'approx') {
    const edtf = `${yyyy}~`;
    const bounds = parseEdtf(edtf)!;
    return {
      edtf,
      asGiven: edtf,
      startIso: bounds.start,
      endIso: bounds.end,
    };
  }

  if (state.precision === 'decade') {
    // 1893 → 189X (decade degli anni Novanta del secolo)
    const decade = `${String(Math.floor(year / 10)).padStart(3, '0')}X`;
    const bounds = parseEdtf(decade)!;
    return {
      edtf: decade,
      asGiven: decade,
      startIso: bounds.start,
      endIso: bounds.end,
    };
  }

  if (state.precision === 'year') {
    const bounds = parseEdtf(yyyy)!;
    return {
      edtf: yyyy,
      asGiven: yyyy,
      startIso: bounds.start,
      endIso: bounds.end,
    };
  }

  const month = parseMonth(state.month);
  if (month === null) {
    return { edtf: null, asGiven: null, startIso: null, endIso: null };
  }
  const mm = pad2(month);

  if (state.precision === 'month') {
    const edtf = `${yyyy}-${mm}`;
    const bounds = parseEdtf(edtf)!;
    return {
      edtf,
      asGiven: edtf,
      startIso: bounds.start,
      endIso: bounds.end,
    };
  }

  // day
  const day = parseDay(state.day, year, month);
  if (day === null) {
    return { edtf: null, asGiven: null, startIso: null, endIso: null };
  }
  const edtf = `${yyyy}-${mm}-${pad2(day)}`;
  const bounds = parseEdtf(edtf)!;
  return {
    edtf,
    asGiven: edtf,
    startIso: bounds.start,
    endIso: bounds.end,
  };
}

/** Ricostruisce lo stato UI da una riga evento già salvata. */
export function edtfToDateInput(
  edtf: string | null | undefined,
  _asGiven?: string | null
): DateInputState {
  if (!edtf?.trim()) return { ...EMPTY_DATE_INPUT };

  const t = edtf.trim();

  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) {
    return { precision: 'day', year: m[1], month: String(Number(m[2])), day: String(Number(m[3])) };
  }

  m = /^(\d{4})-(\d{2})$/.exec(t);
  if (m) {
    return { precision: 'month', year: m[1], month: String(Number(m[2])), day: '' };
  }

  m = /^(\d{4})~$/.exec(t);
  if (m) {
    return { precision: 'approx', year: m[1], month: '', day: '' };
  }

  m = /^(\d{3})X$/.exec(t);
  if (m) {
    return { precision: 'decade', year: `${m[1]}0`, month: '', day: '' };
  }

  m = /^(\d{4})$/.exec(t);
  if (m) {
    return { precision: 'year', year: m[1], month: '', day: '' };
  }

  // Forme non ricostruibili nell'UI (intervalli, ecc.): anno se possibile
  const yearOnly = /^(\d{4})/.exec(t);
  if (yearOnly) {
    return { precision: 'year', year: yearOnly[1], month: '', day: '' };
  }

  return { ...EMPTY_DATE_INPUT };
}
