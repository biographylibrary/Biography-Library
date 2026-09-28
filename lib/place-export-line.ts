import { nfc } from '@/lib/nfc';
import { normalizeWikidataQid } from '@/lib/places';

type PlaceBits = {
  place_name_as_given: string | null;
  place_lat: number | string | null;
  place_lon: number | string | null;
  place_geonames_id?: number | string | null;
  place_wikidata_qid?: string | null;
};

function fmtCoord(n: number | string | null | undefined): string | null {
  if (n === null || n === undefined || n === '') return null;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(6);
}

function geonamesToken(raw: number | string | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return 'UNKNOWN';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n <= 0) return 'UNKNOWN';
  return String(n);
}

/**
 * name | lat | lon | WGS 84 | geonames {id|UNKNOWN} | wikidata {Qid|UNKNOWN}
 * A missing name is the unknown token. Missing numbers stay UNKNOWN.
 */
export function formatPlaceExportValue(
  ev: PlaceBits | null | undefined,
  unk: string
): string {
  const placeName = ev?.place_name_as_given?.trim();
  if (!placeName) return unk;
  const lat = fmtCoord(ev?.place_lat) ?? 'UNKNOWN';
  const lon = fmtCoord(ev?.place_lon) ?? 'UNKNOWN';
  const geonames = geonamesToken(ev?.place_geonames_id);
  const wikidata = normalizeWikidataQid(ev?.place_wikidata_qid) ?? 'UNKNOWN';
  return nfc(`${placeName} | ${lat} | ${lon} | WGS 84 | geonames ${geonames} | wikidata ${wikidata}`);
}
