import { describe, expect, it, vi } from 'vitest';
import {
  GLOBAL_RATE_LIMIT_PER_MIN,
  MAX_MESSAGE_LEN,
  MAX_METADATA_CHARS,
  USER_RATE_LIMIT_PER_MIN,
  handleLogError,
  type CountQuery,
  type LogErrorAdmin,
} from '../../supabase/functions/log-error/handler';

function countQuery(result: { count: number | null; error: unknown }): CountQuery {
  const q = {
    gte: () => q,
    eq: () => q,
    then: (onFulfilled: (v: { count: number | null; error: unknown }) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return q as CountQuery;
}

function mockAdmin(opts: {
  globalCount?: number;
  userCount?: number;
  getUserId?: string | null;
  getUserError?: boolean;
  insertError?: boolean;
  onInsert?: (row: Record<string, unknown>) => void;
}): LogErrorAdmin {
  const inserts: Record<string, unknown>[] = [];
  return {
    auth: {
      getUser: async (_token: string) => {
        if (opts.getUserError) {
          return { data: { user: null }, error: { message: 'bad' } };
        }
        if (opts.getUserId) {
          return { data: { user: { id: opts.getUserId } }, error: null };
        }
        return { data: { user: null }, error: null };
      },
    },
    from: (_table: string) => ({
      select: () => {
        // First await without .eq → global; with .eq → per-user (order: gte then maybe eq).
        let usedEq = false;
        const q: CountQuery = {
          gte: () => q,
          eq: () => {
            usedEq = true;
            return q;
          },
          then: (onFulfilled, onRejected) => {
            const count = usedEq ? (opts.userCount ?? 0) : (opts.globalCount ?? 0);
            return Promise.resolve({ count, error: null }).then(onFulfilled, onRejected);
          },
        };
        return q;
      },
      insert: async (row: Record<string, unknown>) => {
        inserts.push(row);
        opts.onInsert?.(row);
        return { error: opts.insertError ? { message: 'fail' } : null };
      },
    }),
  };
}

function post(body: unknown, auth?: string): Request {
  return new Request('http://localhost/log-error', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('log-error handler', () => {
  it('ignora body.userId e lascia user_id null con token anon', async () => {
    let inserted: Record<string, unknown> | undefined;
    const res = await handleLogError(post({ message: 'boom', userId: 'spoofed-id' }, 'anon-key'), {
      adminClient: mockAdmin({ onInsert: (r) => { inserted = r; } }),
      anonKey: 'anon-key',
    });
    expect(res.status).toBe(200);
    expect(inserted?.user_id).toBeNull();
  });

  it('salva user_id solo se getUser sul JWT di sessione riesce', async () => {
    let inserted: Record<string, unknown> | undefined;
    const res = await handleLogError(post({ message: 'boom', userId: 'spoofed' }, 'user-jwt'), {
      adminClient: mockAdmin({
        getUserId: 'real-user-id',
        onInsert: (r) => { inserted = r; },
      }),
      anonKey: 'anon-key',
    });
    expect(res.status).toBe(200);
    expect(inserted?.user_id).toBe('real-user-id');
  });

  it('risponde 429 se le righe globali dell’ultimo minuto superano 60', async () => {
    const res = await handleLogError(post({ message: 'x' }, 'anon-key'), {
      adminClient: mockAdmin({ globalCount: GLOBAL_RATE_LIMIT_PER_MIN + 1 }),
      anonKey: 'anon-key',
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ ok: false, error: 'rate_limited' });
  });

  it('risponde 429 se lo stesso userId verificato supera 20 al minuto', async () => {
    const res = await handleLogError(post({ message: 'x' }, 'user-jwt'), {
      adminClient: mockAdmin({
        getUserId: 'u1',
        globalCount: 1,
        userCount: USER_RATE_LIMIT_PER_MIN + 1,
      }),
      anonKey: 'anon-key',
    });
    expect(res.status).toBe(429);
  });

  it('accetta fino a 60 globali e 20 per utente (soglia stretta: più di N)', async () => {
    const res = await handleLogError(post({ message: 'x' }, 'user-jwt'), {
      adminClient: mockAdmin({
        getUserId: 'u1',
        globalCount: GLOBAL_RATE_LIMIT_PER_MIN,
        userCount: USER_RATE_LIMIT_PER_MIN,
      }),
      anonKey: 'anon-key',
    });
    expect(res.status).toBe(200);
  });

  it(`tronca il messaggio a ${MAX_MESSAGE_LEN} e scarta metadata oltre ${MAX_METADATA_CHARS} caratteri`, async () => {
    let inserted: Record<string, unknown> | undefined;
    const longMsg = 'm'.repeat(MAX_MESSAGE_LEN + 50);
    const hugeMeta = { blob: 'x'.repeat(MAX_METADATA_CHARS) };
    const res = await handleLogError(
      post({ message: longMsg, metadata: hugeMeta }, 'anon-key'),
      {
        adminClient: mockAdmin({ onInsert: (r) => { inserted = r; } }),
        anonKey: 'anon-key',
      }
    );
    expect(res.status).toBe(200);
    expect(String(inserted?.message).length).toBe(MAX_MESSAGE_LEN);
    expect(inserted?.metadata).toBeNull();
  });
});
