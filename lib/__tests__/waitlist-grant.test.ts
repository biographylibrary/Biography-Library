import { describe, expect, it, vi } from 'vitest';
import { grantWaitlistAccess } from '@/lib/server/waitlist-grant';

function fakeService(rows: Record<string, { account_status: string; email: string; language: string; role?: string }>) {
  const updates: Array<Record<string, unknown>> = [];
  const logs: Array<Record<string, unknown>> = [];

  return {
    updates,
    logs,
    from(table: string) {
      if (table === 'admin_action_log') {
        return {
          insert: async (row: Record<string, unknown>) => {
            logs.push(row);
            return { error: null };
          },
        };
      }
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              return {
                maybeSingle: async () => {
                  const row = rows[id];
                  if (!row) return { data: null, error: null };
                  return { data: { id, ...row }, error: null };
                },
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            eq(_col: string, id: string) {
              return {
                eq(_statusCol: string, required: string) {
                  return {
                    select() {
                      return {
                        maybeSingle: async () => {
                          const row = rows[id];
                          if (!row || row.account_status !== required) {
                            return { data: null, error: null };
                          }
                          row.account_status = payload.account_status as string;
                          updates.push({ id, ...payload });
                          return {
                            data: { id, email: row.email, language: row.language },
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('grantWaitlistAccess', () => {
  it('activates waitlist users and skips already-active ids', async () => {
    const svc = fakeService({
      a: { account_status: 'waitlist', email: 'a@example.com', language: 'it' },
      b: { account_status: 'active', email: 'b@example.com', language: 'en' },
      c: { account_status: 'suspended', email: 'c@example.com', language: 'fr' },
    });
    const sendEmail = vi.fn(async () => undefined);

    const result = await grantWaitlistAccess({
      service: svc as never,
      userIds: ['a', 'b', 'c', 'a'],
      performedBy: 'admin-1',
      sendEmail: sendEmail as never,
    });

    expect(result.granted).toEqual(['a']);
    expect(result.skippedActive).toEqual(['b']);
    expect(result.skipped).toEqual(['c']);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@example.com',
        templateId: 'waitlist_access_granted',
      })
    );
    expect(svc.logs).toHaveLength(1);
    expect(svc.updates[0]).toMatchObject({ account_status: 'active' });
  });
});
