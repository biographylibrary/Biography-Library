import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyBiographyOwnership } from '@/lib/agents/thread-service';

function makeOwnershipClient(
  row: {
    user_id: string;
    biography_mode?: string;
    status?: string;
    biography_type?: string;
    subject_name?: string | null;
    title?: string;
    author_name?: string | null;
  } | null
) {
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
      narrative: {
        biographyType: 'autobiography',
        subjectName: '',
        writerName: '',
      },
    });
  });

  it('returns memorial narrative context when biography is memorial', async () => {
    const client = makeOwnershipClient({
      user_id: 'user-1',
      biography_mode: 'sections',
      status: 'draft',
      biography_type: 'memorial',
      subject_name: 'Francesco',
      title: 'La storia di Francesco',
      author_name: 'Maria',
    });

    const result = await verifyBiographyOwnership(client, 'bio-1', 'user-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.narrative).toEqual({
      biographyType: 'memorial',
      subjectName: 'Francesco',
      writerName: 'Maria',
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
