import { describe, expect, it, vi, afterEach } from 'vitest';
import { sendTransactionalEmail } from '@shared/email/send';

describe('sendTransactionalEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips when Resend env is missing', async () => {
    const result = await sendTransactionalEmail({
      to: 'user@example.com',
      templateId: 'welcome',
      locale: 'en',
      env: { apiKey: null, from: null },
    });
    expect(result).toEqual({ sent: false, skipped: true });
  });

  it('sends when Resend returns success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'email_123' }),
      }),
    );

    const result = await sendTransactionalEmail({
      to: 'user@example.com',
      templateId: 'welcome',
      locale: 'it',
      env: {
        apiKey: 're_test',
        from: 'Biography Library <noreply@biographylibrary.org>',
      },
    });

    expect(result.sent).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
