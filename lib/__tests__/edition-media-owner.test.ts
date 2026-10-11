import { describe, expect, it, vi } from 'vitest';
import { resolveMediaOwnerId } from '@/lib/edition-media-owner';

function clientWith(
  result: { data: unknown; error: unknown } | (() => Promise<{ data: unknown; error: unknown }>)
) {
  const maybeSingle =
    typeof result === 'function'
      ? vi.fn(result)
      : vi.fn(async () => result);
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  };
}

describe('resolveMediaOwnerId', () => {
  it('un originale restituisce il proprio id', async () => {
    const client = clientWith({ data: { translation_of: null }, error: null });
    expect(await resolveMediaOwnerId(client, 'orig-1')).toBe('orig-1');
  });

  it('un\'edizione restituisce l\'id dell\'originale', async () => {
    const client = clientWith({ data: { translation_of: 'orig-1' }, error: null });
    expect(await resolveMediaOwnerId(client, 'ed-1')).toBe('orig-1');
  });

  it('un id inesistente restituisce l\'id ricevuto senza lanciare', async () => {
    const client = clientWith({ data: null, error: null });
    expect(await resolveMediaOwnerId(client, 'missing')).toBe('missing');
  });

  it('una lettura che fallisce restituisce l\'id ricevuto senza lanciare', async () => {
    const client = clientWith({ data: null, error: { message: 'boom' } });
    expect(await resolveMediaOwnerId(client, 'bio-1')).toBe('bio-1');
  });

  it('un throw del client restituisce l\'id ricevuto senza lanciare', async () => {
    const client = clientWith(async () => {
      throw new Error('network');
    });
    expect(await resolveMediaOwnerId(client, 'bio-1')).toBe('bio-1');
  });
});
