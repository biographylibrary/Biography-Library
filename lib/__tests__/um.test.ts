import { describe, expect, it } from 'vitest';
import {
  UM_EPOCH_YEAR,
  formatDateWithUmYear,
  formatUmYear,
  fromJDN,
  toJDN,
  umYear,
  umYearFromDate,
} from '@/lib/um';

describe('toJDN / fromJDN', () => {
  const vectors: Array<[number, number, number, number]> = [
    [1900, 1, 1, 2415021],
    [1948, 3, 14, 2432625],
    [1970, 1, 1, 2440588],
    [2000, 1, 1, 2451545],
    [2026, 9, 3, 2461287],
    [2027, 1, 1, 2461407],
  ];

  it.each(vectors)('%i-%i-%i → JDN %i', (y, m, d, jdn) => {
    expect(toJDN(y, m, d)).toBe(jdn);
  });

  it('round-trips all vectors', () => {
    for (const [y, m, d, jdn] of vectors) {
      expect(fromJDN(jdn)).toEqual({ year: y, month: m, day: d });
      expect(toJDN(y, m, d)).toBe(jdn);
    }
  });
});

describe('umYear', () => {
  it('epoch is 2026', () => {
    expect(UM_EPOCH_YEAR).toBe(2026);
    expect(umYear(2026)).toBe(0);
  });

  it('1 Jan 2027 is year 1 UM', () => {
    expect(umYear(2027)).toBe(1);
    expect(umYearFromDate(new Date('2027-01-01T00:00:00.000Z'))).toBe(1);
  });

  it('31 Dec 2026 is year 0 UM', () => {
    expect(umYearFromDate(new Date('2026-12-31T23:59:59.999Z'))).toBe(0);
  });

  it('UTC boundary: 00:30 first Jan in Lugano is still 0 UM', () => {
    // Lugano CET = UTC+1 → 2027-01-01T00:30+01:00 = 2026-12-31T23:30Z
    const luganoNewYear = new Date('2026-12-31T23:30:00.000Z');
    expect(umYearFromDate(luganoNewYear)).toBe(0);
    expect(luganoNewYear.getUTCFullYear()).toBe(2026);
  });
});

describe('formatUmYear', () => {
  it('short and padded styles', () => {
    expect(formatUmYear(0, 'short')).toBe('0 UM');
    expect(formatUmYear(1, 'short')).toBe('1 UM');
    expect(formatUmYear(0, 'padded')).toBe('0000 UM');
    expect(formatUmYear(1, 'padded')).toBe('0001 UM');
  });

  it('throws on negative without allowNegative', () => {
    expect(() => formatUmYear(-78)).toThrow(/Anno UM negativo/);
  });

  it('allows negative with flag', () => {
    expect(formatUmYear(-78, 'short', { allowNegative: true })).toBe('-78 UM');
    expect(formatUmYear(-78, 'padded', { allowNegative: true })).toBe('-0078 UM');
  });
});

describe('formatDateWithUmYear', () => {
  it('formats day granularity with year word', () => {
    const s = formatDateWithUmYear('2026-09-03T12:00:00.000Z', 'it-IT', 'day', 'Anno');
    expect(s).toMatch(/2026/);
    expect(s).toContain('(Anno 0 UM)');
  });
});
