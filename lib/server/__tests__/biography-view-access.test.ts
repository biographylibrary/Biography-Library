import { describe, expect, it } from 'vitest';
import { verifyBiographyViewAccess } from '@/lib/server/biography-view-access';

function client(status: string) {
  const bio = {
    id: 'bio-1',
    user_id: 'author',
    title: 'Hidden',
    author_name: 'A',
    content: {},
    content_language: 'it',
    visibility: 'public',
    status,
    share_token: 'tok',
  };
  return {
    rpc: async () => ({ data: [{ id: bio.id }], error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: bio, error: null }),
        }),
      }),
    }),
  } as never;
}

describe('verifyBiographyViewAccess', () => {
  it('shows a published public biography', async () => {
    const result = await verifyBiographyViewAccess(client('published'), 'bio-1', {});
    expect(result.ok).toBe(true);
  });

  it('hides revision and suspension statuses, including share links', async () => {
    for (const status of ['revision_requested', 'revision_overdue', 'suspended_pending_verification']) {
      const open = await verifyBiographyViewAccess(client(status), 'bio-1', {});
      const shared = await verifyBiographyViewAccess(client(status), 'bio-1', { shareToken: 'tok' });
      expect(open.ok).toBe(false);
      expect(shared.ok).toBe(false);
    }
  });
});
