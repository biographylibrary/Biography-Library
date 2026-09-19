/**
 * Confronto database ↔ TypeScript sull'epoca UM.
 * Si auto-esclude se mancano le credenziali Supabase (CI / ambienti senza DB).
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { umYearFromDate } from '@/lib/um';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasDb = Boolean(url && serviceKey);

describe.skipIf(!hasDb)('published_um_year trigger vs umYear (UTC)', () => {
  it('trigger value matches TypeScript for a known published_at', async () => {
    const service = createClient(url!, serviceKey!, {
      auth: { persistSession: false },
    });

    // Pick any published row, or skip if none
    const { data: sample } = await service
      .from('biographies')
      .select('id, published_at, published_um_year')
      .not('published_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!sample?.published_at) {
      expect(true).toBe(true); // nothing to compare
      return;
    }

    const expected = umYearFromDate(new Date(sample.published_at as string));
    expect(sample.published_um_year).toBe(expected);
  });

  it('UTC new-year boundary: 2026-12-31T23:30Z → year 0', async () => {
    expect(umYearFromDate(new Date('2026-12-31T23:30:00.000Z'))).toBe(0);
    expect(umYearFromDate(new Date('2027-01-01T00:00:00.000Z'))).toBe(1);
  });
});
