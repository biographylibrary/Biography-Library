import { describe, expect, it } from 'vitest';
import {
  geonamesSearchUrl,
  mapGeonamesHit,
  mapNominatimHit,
  nominatimSearchUrl,
  normalizeWikidataQid,
} from '@/lib/places';

describe('place search URLs', () => {
  it('asks Nominatim for extratags so Wikidata (and GeoNames if present) can be stored', () => {
    const url = nominatimSearchUrl('Lugano', 'it');
    expect(url).toContain('extratags=1');
    expect(url).toContain('format=jsonv2');
    expect(url).toContain('q=Lugano');
  });

  it('keeps GeoNames as a populated-place search without a Wikidata field', () => {
    const url = geonamesSearchUrl('Lugano', 'demo', 'it');
    expect(url).toContain('featureClass=P');
    expect(url).toContain('username=demo');
  });
});

describe('normalizeWikidataQid', () => {
  it('accepts Q-form, lowercase, and entity URLs', () => {
    expect(normalizeWikidataQid('Q7024')).toBe('Q7024');
    expect(normalizeWikidataQid('q7024')).toBe('Q7024');
    expect(normalizeWikidataQid('http://www.wikidata.org/entity/Q7024')).toBe('Q7024');
    expect(normalizeWikidataQid('https://www.wikidata.org/wiki/Q7024')).toBe('Q7024');
    expect(normalizeWikidataQid('Lugano')).toBeNull();
    expect(normalizeWikidataQid('')).toBeNull();
    expect(normalizeWikidataQid(null)).toBeNull();
  });
});

describe('gazetteer mapping', () => {
  it('leaves GeoNames Wikidata empty (searchJSON has no Q-id; no extra round-trip)', () => {
    const hit = mapGeonamesHit({
      name: 'Lugano',
      adminName1: 'Ticino',
      countryName: 'Switzerland',
      lat: '46.01008',
      lng: '8.96004',
      geonameId: 2659836,
      countryCode: 'CH',
    });
    expect(hit.geonamesId).toBe(2659836);
    expect(hit.wikidataQid).toBeNull();
    expect(hit.lat).toBeCloseTo(46.01008);
    expect(hit.lon).toBeCloseTo(8.96004);
  });

  it('reads Wikidata and GeoNames from Nominatim extratags', () => {
    const hit = mapNominatimHit({
      display_name: 'Lugano, Ticino, Switzerland',
      name: 'Lugano',
      lat: '46.01008',
      lon: '8.96004',
      extratags: { wikidata: 'Q7024', geonames: '2659836' },
    });
    expect(hit.wikidataQid).toBe('Q7024');
    expect(hit.geonamesId).toBe(2659836);
  });

  it('also reads geonames:id from Nominatim extratags', () => {
    const hit = mapNominatimHit({
      display_name: 'Lugano',
      name: 'Lugano',
      lat: '46.01',
      lon: '8.96',
      extratags: { 'geonames:id': '2659836' },
    });
    expect(hit.geonamesId).toBe(2659836);
  });
});
