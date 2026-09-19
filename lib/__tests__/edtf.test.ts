import { describe, expect, it } from 'vitest';
import { isValidEdtf, parseEdtf } from '@/lib/edtf';

describe('parseEdtf — accepted forms', () => {
  it('YYYY-MM-DD', () => {
    expect(parseEdtf('1948-03-14')).toEqual({
      start: '1948-03-14',
      end: '1948-03-14',
    });
  });

  it('YYYY-MM', () => {
    expect(parseEdtf('1948-03')).toEqual({
      start: '1948-03-01',
      end: '1948-03-31',
    });
  });

  it('YYYY', () => {
    expect(parseEdtf('1948')).toEqual({
      start: '1948-01-01',
      end: '1948-12-31',
    });
  });

  it('YYYY~ / ? / %', () => {
    expect(parseEdtf('1893~')).toEqual({ start: '1893-01-01', end: '1893-12-31' });
    expect(parseEdtf('1893?')).toEqual({ start: '1893-01-01', end: '1893-12-31' });
    expect(parseEdtf('1893%')).toEqual({ start: '1893-01-01', end: '1893-12-31' });
  });

  it('YYYX decade', () => {
    expect(parseEdtf('189X')).toEqual({ start: '1890-01-01', end: '1899-12-31' });
  });

  it('YYXX century', () => {
    expect(parseEdtf('18XX')).toEqual({ start: '1800-01-01', end: '1899-12-31' });
  });

  it('[YYYY..]', () => {
    expect(parseEdtf('[1900..]')).toEqual({ start: '1900-01-01', end: '9999-12-31' });
  });

  it('[..YYYY]', () => {
    expect(parseEdtf('[..1900]')).toEqual({ start: '0001-01-01', end: '1900-12-31' });
  });

  it('YYYY/YYYY', () => {
    expect(parseEdtf('1890/1895')).toEqual({ start: '1890-01-01', end: '1895-12-31' });
  });

  it('leap day', () => {
    expect(parseEdtf('2000-02-29')).toEqual({ start: '2000-02-29', end: '2000-02-29' });
  });
});

describe('parseEdtf — rejected forms (strict)', () => {
  const rejected = [
    '',
    ' 1948',
    '1948 ',
    'circa 1893',
    '1893 circa',
    '1948-3-14',
    '1948-03-14~',
    '1948-03~',
    '1893~~',
    'XXXX',
    '18X0',
    '1890/1880',
    '2001-02-29',
    '1948-13-01',
    '1948-00-01',
    '[1900..1910]',
    '{1900,1901}',
    '1948-03-14T12:00:00',
    'um-0000',
  ];

  it.each(rejected)('rejects %j', (s) => {
    expect(parseEdtf(s)).toBeNull();
    expect(isValidEdtf(s)).toBe(false);
  });
});
