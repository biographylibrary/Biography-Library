const CACHE_TTL_MS = 10_000;

type CacheEntry = { enabled: boolean; expiresAt: number };

let cache: CacheEntry | null = null;

/** Test helper — clears the in-memory maintenance flag cache. */
export function clearMaintenanceFlagCache(): void {
  cache = null;
}

/** Test helper — seeds the cache without a network call. */
export function seedMaintenanceFlagCache(enabled: boolean, ttlMs = CACHE_TTL_MS): void {
  cache = { enabled, expiresAt: Date.now() + ttlMs };
}

export type FetchMaintenanceOptions = {
  fetchImpl?: typeof fetch;
  now?: () => number;
};

/**
 * Reads `site_settings.maintenance` via Supabase REST (anon key).
 * Fail-open: on any error returns false and logs.
 * In-memory cache ~10 seconds.
 */
export async function fetchMaintenanceEnabled(
  options: FetchMaintenanceOptions = {}
): Promise<boolean> {
  const now = options.now?.() ?? Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.enabled;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('[maintenance] missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY; fail-open');
    return false;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const endpoint = new URL('/rest/v1/site_settings', url);
    endpoint.searchParams.set('key', 'eq.maintenance');
    endpoint.searchParams.set('select', 'value');

    const res = await fetchImpl(endpoint.toString(), {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
      // Edge-friendly; avoid Next fetch caching surprises in middleware.
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[maintenance] REST read failed', res.status);
      return false;
    }

    const rows = (await res.json()) as Array<{ value?: { enabled?: unknown } }>;
    const enabled = rows[0]?.value?.enabled === true;
    cache = { enabled, expiresAt: now + CACHE_TTL_MS };
    return enabled;
  } catch (err) {
    console.error('[maintenance] REST read error; fail-open', err);
    return false;
  }
}
