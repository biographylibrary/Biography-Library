import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import type { PlaceSearchHit } from '@/lib/places';

export type { PlaceSearchHit };

/**
 * Ricerca località a livello città/villaggio.
 * Preferisce GeoNames se GEONAMES_USERNAME è configurato; altrimenti Nominatim.
 * Coordinate e id restano dietro le quinte — l'UI mostra solo il nome.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] as PlaceSearchHit[] });
  }
  if (q.length > 120) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  const lang = (req.nextUrl.searchParams.get('lang') ?? 'en').slice(0, 5);
  const username = process.env.GEONAMES_USERNAME?.trim();

  try {
    const results = username
      ? await searchGeonames(q, username, lang)
      : await searchNominatim(q, lang);
    return NextResponse.json({ results, provider: username ? 'geonames' : 'nominatim' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Place search failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function searchGeonames(
  q: string,
  username: string,
  lang: string
): Promise<PlaceSearchHit[]> {
  const url = new URL('https://secure.geonames.org/searchJSON');
  url.searchParams.set('q', q);
  url.searchParams.set('maxRows', '8');
  url.searchParams.set('featureClass', 'P');
  url.searchParams.set('username', username);
  url.searchParams.set('lang', lang);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`GeoNames HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    geonames?: Array<{
      name: string;
      toponymName?: string;
      countryName?: string;
      adminName1?: string;
      lat: string;
      lng: string;
      geonameId: number;
      countryCode?: string;
    }>;
    status?: { message?: string };
  };
  if (data.status?.message) {
    throw new Error(data.status.message);
  }

  return (data.geonames ?? []).map((g) => {
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
  });
}

async function searchNominatim(q: string, lang: string): Promise<PlaceSearchHit[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '8');
  url.searchParams.set('featureType', 'settlement');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('accept-language', lang);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'BiographyLibrary/1.0 (permanence; https://biographylibrary.org)',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    display_name: string;
    name?: string;
    lat: string;
    lon: string;
    extratags?: { wikidata?: string };
  }>;

  return data.map((item) => ({
    name: item.name || item.display_name.split(',')[0]?.trim() || item.display_name,
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
    geonamesId: null,
    wikidataQid: item.extratags?.wikidata ?? null,
    countryCode: null,
  }));
}
