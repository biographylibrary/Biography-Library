import { describe, expect, it } from 'vitest';
import { dateInputToEdtf, edtfToDateInput } from '@/lib/date-input';

describe('dateInputToEdtf', () => {
  it('maps exact day', () => {
    const r = dateInputToEdtf({
      precision: 'day',
      year: '1948',
      month: '3',
      day: '14',
    });
    expect(r.edtf).toBe('1948-03-14');
    expect(r.startIso).toBe('1948-03-14');
    expect(r.endIso).toBe('1948-03-14');
  });

  it('maps approx year to EDTF tilde', () => {
    const r = dateInputToEdtf({
      precision: 'approx',
      year: '1893',
      month: '',
      day: '',
    });
    expect(r.edtf).toBe('1893~');
  });

  it('maps decade', () => {
    const r = dateInputToEdtf({
      precision: 'decade',
      year: '1893',
      month: '',
      day: '',
    });
    expect(r.edtf).toBe('189X');
    expect(r.startIso).toBe('1890-01-01');
    expect(r.endIso).toBe('1899-12-31');
  });

  it('unknown yields null', () => {
    const r = dateInputToEdtf({
      precision: 'unknown',
      year: '1948',
      month: '',
      day: '',
    });
    expect(r.edtf).toBeNull();
  });
});

describe('edtfToDateInput', () => {
  it('round-trips day', () => {
    expect(edtfToDateInput('1948-03-14')).toEqual({
      precision: 'day',
      year: '1948',
      month: '3',
      day: '14',
    });
  });

  it('round-trips approx', () => {
    expect(edtfToDateInput('1893~').precision).toBe('approx');
  });
});
