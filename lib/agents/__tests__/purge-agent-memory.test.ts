import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeAgentMemoryForBiography } from '@/lib/agents/purge-agent-memory';

type Call = { table: string; op: string; col: string; value: unknown };

/** Finto client che registra le cancellazioni; `threads` sono le righe di agent_threads della biografia. */
function fakeClient(threads: Array<{ id: string }>, failOn?: string) {
  const calls: Call[] = [];
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: async (col: string, value: unknown) => {
          calls.push({ table, op: 'select', col, value });
          return { data: threads, error: failOn === `${table}.select` ? new Error('boom') : null };
        },
      }),
      delete: () => ({
        eq: async (col: string, value: unknown) => {
          calls.push({ table, op: 'delete', col, value });
          return { error: failOn === `${table}.delete` ? new Error('boom') : null };
        },
        in: async (col: string, value: unknown) => {
          calls.push({ table, op: 'delete', col, value });
          return { error: failOn === `${table}.delete` ? new Error('boom') : null };
        },
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('purgeAgentMemoryForBiography', () => {
  it('cancella fatti, messaggi, thread e frammenti di quella biografia', async () => {
    const { client, calls } = fakeClient([{ id: 't1' }, { id: 't2' }]);
    await purgeAgentMemoryForBiography(client, 'bio-1');
    expect(calls).toEqual([
      { table: 'agent_threads', op: 'select', col: 'biography_id', value: 'bio-1' },
      { table: 'agent_memory_facts', op: 'delete', col: 'thread_id', value: ['t1', 't2'] },
      { table: 'agent_messages', op: 'delete', col: 'thread_id', value: ['t1', 't2'] },
      { table: 'agent_threads', op: 'delete', col: 'id', value: ['t1', 't2'] },
      { table: 'biography_chunks', op: 'delete', col: 'biography_id', value: 'bio-1' },
    ]);
  });

  it('è idempotente: senza thread cancella solo i frammenti', async () => {
    const { client, calls } = fakeClient([]);
    await purgeAgentMemoryForBiography(client, 'bio-1');
    expect(calls.map((c) => `${c.table}.${c.op}`)).toEqual(['agent_threads.select', 'biography_chunks.delete']);
  });

  it('non tocca ai_token_usage né i thread generali di Echo', async () => {
    const { client, calls } = fakeClient([{ id: 't1' }]);
    await purgeAgentMemoryForBiography(client, 'bio-1');
    expect(calls.some((c) => c.table === 'ai_token_usage')).toBe(false);
    expect(calls.filter((c) => c.table === 'agent_threads' && c.op === 'select').every((c) => c.col === 'biography_id')).toBe(true);
  });

  it('se una cancellazione fallisce lancia, così il chiamante non crede la memoria cancellata', async () => {
    const { client } = fakeClient([{ id: 't1' }], 'agent_messages.delete');
    await expect(purgeAgentMemoryForBiography(client, 'bio-1')).rejects.toThrow('boom');
  });
});
