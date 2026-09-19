import { describe, expect, it } from 'vitest';
import {
  UM_ALPHABET,
  checkChar,
  isValidUmId,
  mintUmId,
  normalizeUmId,
  toCanonical,
} from '@/lib/um-id';

/** Specifica pubblica §7 — vettori di prova vincolanti. */
const SPEC_VECTORS: Array<{ year: number; body11: string; full: string }> = [
  { year: 0, body11: 'k3nq7fx2mvp', full: 'UM-0000-K3NQ-7FX2-MVP4' },
  { year: 0, body11: 'bcdfghjkmnp', full: 'UM-0000-BCDF-GHJK-MNPP' },
  { year: 1, body11: '00000000000', full: 'UM-0001-0000-0000-0004' },
  { year: 25, body11: 'z9x8w7v6t5s', full: 'UM-0025-Z9X8-W7V6-T5ST' },
  { year: 100, body11: 'qqqqqqqqqqq', full: 'UM-0100-QQQQ-QQQQ-QQQQ' },
  { year: 9999, body11: 'k3nq7fx2mvp', full: 'UM-9999-K3NQ-7FX2-MVP7' },
  { year: 10000, body11: 'k3nq7fx2mvp', full: 'UM-10000-K3NQ-7FX2-MVP3' },
  { year: 99999, body11: 'z9x8w7v6t5s', full: 'UM-99999-Z9X8-W7V6-T5S2' },
];

/**
 * Sostituisce un solo carattere del corpo, lasciando intatti anno e carattere
 * di controllo. Il taglio parte dal fondo: l'anno può essere lungo a piacere.
 */
function tamperOneBodyChar(full: string): string {
  const t = normalizeUmId(full);
  const head = t.slice(0, t.length - 12);
  const body = t.slice(t.length - 12);
  const next = UM_ALPHABET[(UM_ALPHABET.indexOf(body[0]!) + 1) % UM_ALPHABET.length]!;
  return (head + next + body.slice(1)).toUpperCase();
}

describe('UM checkChar — spec vectors', () => {
  it.each(SPEC_VECTORS)('$full', ({ year, body11, full }) => {
    const yearStr = String(year).padStart(4, '0');
    const expectedCheck = full.slice(-1).toLowerCase();
    expect(checkChar(yearStr + body11)).toBe(expectedCheck);
    expect(mintUmId(year, body11)).toBe(full);
    expect(isValidUmId(full)).toBe(true);
    // Un solo carattere alterato deve sempre essere rifiutato (spec §6).
    expect(isValidUmId(tamperOneBodyChar(full))).toBe(false);
  });
});

describe('normalizeUmId / toCanonical', () => {
  it('treats dashes, spaces and case as the same identity', () => {
    const a = 'UM-0000-K3NQ-7FX2-MVP4';
    const b = 'um0000k3nq7fx2mvp4';
    const c = 'um-0000-k3nq-7fx2-mvp4';
    const d = 'UM 0000 K3NQ 7FX2 MVP4';
    expect(normalizeUmId(a)).toBe(normalizeUmId(b));
    expect(normalizeUmId(a)).toBe(normalizeUmId(c));
    expect(normalizeUmId(a)).toBe(normalizeUmId(d));
    expect(toCanonical(b)).toBe(a);
    expect(toCanonical(c)).toBe(a);
  });

  it('normalizes a five-digit year the same way', () => {
    const a = 'UM-10000-K3NQ-7FX2-MVP3';
    const b = 'UM10000K3NQ7FX2MVP3';
    const c = 'um-10000-k3nq-7fx2-mvp3';
    expect(normalizeUmId(a)).toBe(normalizeUmId(b));
    expect(normalizeUmId(a)).toBe(normalizeUmId(c));
    expect(toCanonical(b)).toBe(a);
    expect(toCanonical(c)).toBe(a);
    expect(isValidUmId(b)).toBe(true);
    expect(isValidUmId(c)).toBe(true);
  });
});

describe('isValidUmId', () => {
  it('rejects bad check digit', () => {
    expect(isValidUmId('UM-0000-K3NQ-7FX2-MVP5')).toBe(false);
  });

  it('rejects vowels and L', () => {
    expect(isValidUmId('UM-0000-AAAA-AAAA-AAAA')).toBe(false);
  });
});
