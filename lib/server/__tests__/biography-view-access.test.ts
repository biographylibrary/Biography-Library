import { describe, expect, it } from 'vitest';
import { verifyBiographyViewAccess } from '@/lib/server/biography-view-access';

function client(opts: {
  status?: string;
  visibility?: string;
  publicReadAllowed?: boolean | unknown;
  userId?: string;
  profileRole?: string | null;
}) {
  const bio = {
    id: 'bio-1',
    user_id: opts.userId ?? 'author',
    title: 'Hidden',
    author_name: 'A',
    content: {},
    record_language_tag: 'it',
    visibility: opts.visibility ?? 'public',
    status: opts.status ?? 'published',
    share_token: 'tok',
  };
  const publicRead =
    opts.publicReadAllowed === undefined ? true : opts.publicReadAllowed;

  return {
    rpc: async (name: string) => {
      if (name === 'biography_public_read_allowed') {
        return { data: publicRead, error: null };
      }
      return { data: [{ id: bio.id }], error: null };
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === 'profiles') {
              return {
                data: opts.profileRole ? { role: opts.profileRole } : null,
                error: null,
              };
            }
            return { data: bio, error: null };
          },
        }),
      }),
    }),
  } as never;
}

describe('verifyBiographyViewAccess', () => {
  it('shows a published public biography when biography_public_read_allowed is true', async () => {
    const result = await verifyBiographyViewAccess(client({}), 'bio-1', {});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.accessType).toBe('public');
  });

  it('hides revision and suspension statuses, including share links', async () => {
    for (const status of ['revision_requested', 'revision_overdue', 'suspended_pending_verification']) {
      const open = await verifyBiographyViewAccess(client({ status }), 'bio-1', {});
      const shared = await verifyBiographyViewAccess(client({ status }), 'bio-1', {
        shareToken: 'tok',
      });
      expect(open.ok).toBe(false);
      expect(shared.ok).toBe(false);
    }
  });

  it('rifiuta accesso public se l\'account autore è sospeso (rpc false)', async () => {
    const result = await verifyBiographyViewAccess(
      client({ publicReadAllowed: false }),
      'bio-1',
      {}
    );
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ status: 403 });
  });

  it('edizione con originale non pubblicato: niente accesso public', async () => {
    const result = await verifyBiographyViewAccess(
      client({ publicReadAllowed: false }),
      'edition-1',
      {}
    );
    expect(result.ok).toBe(false);
  });

  it('edizione con originale pubblico: accesso public', async () => {
    const result = await verifyBiographyViewAccess(
      client({ publicReadAllowed: true }),
      'edition-1',
      {}
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.accessType).toBe('public');
  });

  it('scheda pubblica normale: accesso public', async () => {
    const result = await verifyBiographyViewAccess(
      client({ status: 'published', visibility: 'public', publicReadAllowed: true }),
      'bio-1',
      {}
    );
    expect(result.ok).toBe(true);
  });

  it('con rpc false il proprietario entra ancora', async () => {
    const result = await verifyBiographyViewAccess(
      client({ publicReadAllowed: false, userId: 'author' }),
      'bio-1',
      { userId: 'author' }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.accessType).toBe('owner-staff');
  });
});
