import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import {
  geonamesSearchUrl,
  mapGeonamesHit,
  mapNominatimHit,
  nominatimSearchUrl,
  type PlaceSearchHit,
} from '@/lib/places';

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
  const res = await fetch(geonamesSearchUrl(q, username, lang), {
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

  return (data.geonames ?? []).map(mapGeonamesHit);
}

async function searchNominatim(q: string, lang: string): Promise<PlaceSearchHit[]> {
  const res = await fetch(nominatimSearchUrl(q, lang), {
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
    extratags?: Record<string, string>;
  }>;

  return data.map(mapNominatimHit);
}
