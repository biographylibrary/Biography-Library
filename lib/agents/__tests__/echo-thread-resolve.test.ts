import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveEchoActiveThread } from '@/lib/agents/echo-thread-resolve';

function makeThreadQueryChain(rows: Record<string, unknown>[]) {
  const result = { data: rows, error: null };
  const chain: {
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
  } = {
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
  };
  chain.eq.mockImplementation((column: string) => {
    if (column === 'biography_id') return Promise.resolve(result);
    return chain;
  });
  chain.in.mockReturnValue(chain);
  chain.is.mockResolvedValue(result);
  return chain;
}

describe('resolveEchoActiveThread', () => {
  it('promotes a single legacy platform_guide thread to echo', async () => {
    const legacy = {
      id: 'legacy-1',
      user_id: 'user-1',
      biography_id: 'bio-1',
      agent_type: 'platform_guide',
      message_count: 12,
    };

    const updateSingle = vi.fn().mockResolvedValue({
      data: { ...legacy, agent_type: 'echo' },
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === 'agent_threads') {
        return {
          select: vi.fn(() => makeThreadQueryChain([legacy])),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({ single: updateSingle })),
            })),
          })),
        };
      }
      return {};
    });

    const client = { from } as unknown as SupabaseClient;
    const thread = await resolveEchoActiveThread(client, {
      userId: 'user-1',
      biographyId: 'bio-1',
    });

    expect(thread?.id).toBe('legacy-1');
    expect(thread?.agent_type).toBe('echo');
  });

  it('deletes an empty echo thread and keeps legacy history', async () => {
    const legacy = {
      id: 'legacy-1',
      user_id: 'user-1',
      biography_id: 'bio-1',
      agent_type: 'platform_guide',
      message_count: 8,
    };
    const emptyEcho = {
      id: 'echo-empty',
      user_id: 'user-1',
      biography_id: 'bio-1',
      agent_type: 'echo',
      message_count: 0,
    };

    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const updateSingle = vi.fn().mockResolvedValue({
      data: { ...legacy, agent_type: 'echo' },
      error: null,
    });

    const messageCounts: Record<string, number> = {
      'legacy-1': 8,
      'echo-empty': 0,
    };

    const from = vi.fn((table: string) => {
      if (table === 'agent_threads') {
        return {
          select: vi.fn(() => makeThreadQueryChain([emptyEcho, legacy])),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({ single: updateSingle })),
            })),
          })),
          delete: vi.fn(() => ({ eq: deleteEq })),
        };
      }
      if (table === 'agent_messages') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_: string, threadId: string) =>
              Promise.resolve({ count: messageCounts[threadId], error: null }),
            ),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      return {};
    });

    const client = { from } as unknown as SupabaseClient;
    const thread = await resolveEchoActiveThread(client, {
      userId: 'user-1',
      biographyId: 'bio-1',
    });

    expect(thread?.id).toBe('legacy-1');
    expect(deleteEq).toHaveBeenCalledWith('id', 'echo-empty');
  });
});
