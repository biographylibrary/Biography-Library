import type { SupabaseClient } from '@supabase/supabase-js';
import { MANUAL_META } from '@/lib/help/manual-meta.generated';
import type { KbLocale } from '@/lib/agents/kb/help-kb-sections';

/** Lock TTL: un processo morto non tiene Echo bloccato. */
export const KB_RESEED_LOCK_TTL_MS = 10 * 60 * 1000;

export type KbIndexRow = {
  locale: string;
  version: string;
  content_hash: string;
  updated_at: string;
  reseed_locked_until: string | null;
};

export function buildKbContentHash(): string {
  return MANUAL_META.hash;
}

export function buildKbVersion(): string {
  return MANUAL_META.version;
}

export async function readKbIndexState(
  serviceClient: SupabaseClient,
  locale: KbLocale
): Promise<KbIndexRow | null> {
  const { data, error } = await serviceClient
    .from('kb_index_state')
    .select('locale, version, content_hash, updated_at, reseed_locked_until')
    .eq('locale', locale)
    .maybeSingle();
  if (error) {
    console.warn('[kb-index-state] read failed:', error.message);
    return null;
  }
  return (data as KbIndexRow | null) ?? null;
}

export function isKbIndexCurrent(row: KbIndexRow | null): boolean {
  if (!row) return false;
  return row.content_hash === buildKbContentHash() && row.version === buildKbVersion();
}

/**
 * Acquisisce il lock di reseed se libero o scaduto.
 * Ritorna true se questo processo può procedere.
 */
export async function tryAcquireKbReseedLock(
  serviceClient: SupabaseClient,
  locale: KbLocale,
  now = new Date()
): Promise<boolean> {
  const until = new Date(now.getTime() + KB_RESEED_LOCK_TTL_MS).toISOString();
  const existing = await readKbIndexState(serviceClient, locale);

  if (existing?.reseed_locked_until) {
    const lockedUntil = new Date(existing.reseed_locked_until).getTime();
    if (lockedUntil > now.getTime()) {
      return false;
    }
  }

  const row = {
    locale,
    version: existing?.version ?? buildKbVersion(),
    content_hash: existing?.content_hash ?? '',
    updated_at: existing?.updated_at ?? now.toISOString(),
    reseed_locked_until: until,
  };

  const { error } = await serviceClient.from('kb_index_state').upsert(row, { onConflict: 'locale' });
  if (error) {
    console.warn('[kb-index-state] lock failed:', error.message);
    return false;
  }
  return true;
}

export async function releaseKbReseedLock(
  serviceClient: SupabaseClient,
  locale: KbLocale,
  meta: { version: string; content_hash: string }
): Promise<void> {
  const { error } = await serviceClient.from('kb_index_state').upsert(
    {
      locale,
      version: meta.version,
      content_hash: meta.content_hash,
      updated_at: new Date().toISOString(),
      reseed_locked_until: null,
    },
    { onConflict: 'locale' }
  );
  if (error) {
    console.warn('[kb-index-state] release failed:', error.message);
  }
}

export type KbDriftInfo = {
  buildVersion: string;
  buildHash: string;
  indexedVersion: string | null;
  indexedHash: string | null;
  drifted: boolean;
};

export async function getKbIndexDrift(
  serviceClient: SupabaseClient,
  locale: KbLocale = 'en'
): Promise<KbDriftInfo> {
  const row = await readKbIndexState(serviceClient, locale);
  const buildVersion = buildKbVersion();
  const buildHash = buildKbContentHash();
  return {
    buildVersion,
    buildHash,
    indexedVersion: row?.version ?? null,
    indexedHash: row?.content_hash ?? null,
    drifted: !isKbIndexCurrent(row),
  };
}
