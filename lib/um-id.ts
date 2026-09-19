/**
 * Identificativo UM — specifica pubblica 1.0.
 * Alfabeto, algoritmo di controllo e minting: non inventare varianti.
 */

import { umYearFromDate } from '@/lib/um';

/** 29 caratteri (29 è primo). Vocali e L escluse. */
export const UM_ALPHABET = '0123456789bcdfghjkmnpqrstvwxz';
const ALPHABET = UM_ALPHABET;
const IDX = new Map(Array.from(ALPHABET).map((c, i) => [c, i]));

/** Byte ≥ 232 scartati: 256 non è multiplo di 29; evita bias sui primi caratteri. */
const REJECTION_THRESHOLD = 29 * 8; // 232

/** Carattere di controllo su "cifre dell'anno" + "undici caratteri del corpo". */
export function checkChar(core: string): string {
  let sum = 0;
  for (let i = 0; i < core.length; i++) {
    sum += (i + 1) * (IDX.get(core[i]!) ?? 0);
  }
  return ALPHABET[sum % 29]!;
}

export function normalizeUmId(s: string): string {
  return s.replace(/[-\s]/g, '').toLowerCase();
}

/**
 * Forma canonica maiuscola con trattini: UM-0000-K3NQ-7FX2-MVP4
 * Accetta già normalizzato o forma mista.
 */
export function toCanonical(s: string): string {
  const t = normalizeUmId(s);
  if (!t.startsWith('um')) {
    throw new Error(`Identificativo UM non valido: ${s}`);
  }
  const rest = t.slice(2);
  if (rest.length < 16) {
    throw new Error(`Identificativo UM troppo corto: ${s}`);
  }
  const year = rest.slice(0, rest.length - 12);
  const body = rest.slice(rest.length - 12);
  return `UM-${year}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`.toUpperCase();
}

/** Undici caratteri casuali dall'alfabeto, con rifiuto campionario (crypto). */
export function randomBody11(): string {
  const out: string[] = [];
  const buf = new Uint8Array(1);
  while (out.length < 11) {
    crypto.getRandomValues(buf);
    const b = buf[0]!;
    if (b >= REJECTION_THRESHOLD) continue;
    out.push(ALPHABET[b % 29]!);
  }
  return out.join('');
}

/**
 * Genera un identificativo. `random11` va prodotto con un generatore
 * crittograficamente sicuro e verificato contro il registro prima dell'uso.
 */
export function mintUmId(umYearValue: number, random11: string): string {
  if (
    random11.length !== 11 ||
    !Array.from(random11).every((c) => IDX.has(c))
  ) {
    throw new Error('random11 deve essere 11 caratteri dell\'alfabeto UM');
  }
  const year = String(umYearValue).padStart(4, '0');
  const body = random11 + checkChar(year + random11);
  return `UM-${year}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`.toUpperCase();
}

/** Conia un nuovo identificativo per l'istante corrente (anno UM in UTC). */
export function mintUmIdNow(now: Date = new Date()): string {
  return mintUmId(umYearFromDate(now), randomBody11());
}

export function isValidUmId(s: string): boolean {
  const t = normalizeUmId(s);
  if (!t.startsWith('um')) return false;
  const rest = t.slice(2);
  if (rest.length < 16) return false;
  const year = rest.slice(0, rest.length - 12);
  const body = rest.slice(rest.length - 12);
  if (year.length < 4 || !/^\d+$/.test(year)) return false;
  if (!Array.from(body).every((c) => IDX.has(c))) return false;
  return checkChar(year + body.slice(0, 11)) === body[11];
}
