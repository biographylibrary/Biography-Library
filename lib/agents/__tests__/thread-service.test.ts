import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyBiographyOwnership } from '@/lib/agents/thread-service';

function makeOwnershipClient(row: { user_id: string; biography_mode?: string; status?: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row });
  const eqId = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: eqId }));
  const from = vi.fn(() => ({ select }));
  return { from } as unknown as SupabaseClient;
}

describe('verifyBiographyOwnership', () => {
  it('returns ok when the biography belongs to the user', async () => {
    const client = makeOwnershipClient({
      user_id: 'user-1',
      biography_mode: 'sections',
      status: 'draft',
    });

    const result = await verifyBiographyOwnership(client, 'bio-1', 'user-1');
    expect(result).toEqual({
      ok: true,
      biography_mode: 'sections',
      status: 'draft',
    });
  });

  it('returns ok false when biography is missing', async () => {
    const client = makeOwnershipClient(null);
    const result = await verifyBiographyOwnership(client, 'bio-1', 'user-1');
    expect(result).toEqual({ ok: false });
  });

  it('returns ok false when biography belongs to another user', async () => {
    const client = makeOwnershipClient({ user_id: 'other-user', status: 'draft' });
    const result = await verifyBiographyOwnership(client, 'bio-1', 'user-1');
    expect(result).toEqual({ ok: false });
  });
});
