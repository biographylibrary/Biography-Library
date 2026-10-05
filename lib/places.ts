export type PlaceSearchHit = {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  geonamesId: number | null;
  wikidataQid: string | null;
  countryCode: string | null;
};

const GEONAMES_SEARCH = 'https://secure.geonames.org/searchJSON';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

export function geonamesSearchUrl(q: string, username: string, lang: string): string {
  const url = new URL(GEONAMES_SEARCH);
  url.searchParams.set('q', q);
  url.searchParams.set('maxRows', '8');
  url.searchParams.set('featureClass', 'P');
  url.searchParams.set('username', username);
  url.searchParams.set('lang', lang);
  return url.toString();
}

export function nominatimSearchUrl(q: string, lang: string): string {
  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '8');
  url.searchParams.set('featureType', 'settlement');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('accept-language', lang);
  return url.toString();
}

/** Accepts Q7024, q7024, or a Wikidata entity URL. Returns Q-form or null. */
export function normalizeWikidataQid(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  const fromUrl = t.match(/\/(Q\d+)$/i);
  const token = fromUrl ? fromUrl[1] : t;
  const m = token.match(/^Q(\d+)$/i);
  return m ? `Q${m[1]}` : null;
}

export function mapGeonamesHit(g: {
  name: string;
  countryName?: string;
  adminName1?: string;
  lat: string;
  lng: string;
  geonameId: number;
  countryCode?: string;
}): PlaceSearchHit {
  const parts = [g.name, g.adminName1, g.countryName].filter(Boolean);
  return {
    name: g.name,
    displayName: parts.join(', '),
    lat: Number(g.lat),
    lon: Number(g.lng),
    geonamesId: g.geonameId,
    wikidataQid: null,
    countryCode: g.countryCode ?? null,
  };
}

export function mapNominatimHit(item: {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  extratags?: Record<string, string>;
}): PlaceSearchHit {
  const tags = item.extratags ?? {};
  const geonamesRaw = (tags.geonames || tags['geonames:id'] || '').trim();
  const geonamesId = geonamesRaw && /^\d+$/.test(geonamesRaw) ? Number(geonamesRaw) : null;
  return {
    name: item.name || item.display_name.split(',')[0]?.trim() || item.display_name,
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
    geonamesId,
    wikidataQid: normalizeWikidataQid(tags.wikidata),
    countryCode: null,
  };
}

/**
 * La ricerca dei luoghi parte solo quando a scrivere è l'autore, e solo se non ha già scelto
 * un luogo. Un valore caricato dal salvataggio (o appena scelto dall'elenco) non deve far
 * partire una ricerca: aprirebbe un elenco per ogni campo già compilato, appena si apre la finestra.
 */
export function shouldSearchPlace(query: string, hasSelection: boolean, userTyped: boolean): boolean {
  return userTyped && !hasSelection && query.trim().length >= 2;
}

/** I fornitori restituiscono a volte due voci con lo stesso nome mostrato: se ne tiene una. */
export function dedupePlaceHits(hits: PlaceSearchHit[]): PlaceSearchHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = hit.displayName.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

