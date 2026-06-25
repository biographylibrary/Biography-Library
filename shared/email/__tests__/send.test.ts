import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizeFromEmail, sendTransactionalEmail } from '@shared/email/send';

describe('normalizeFromEmail', () => {
  it('strips surrounding double quotes', () => {
    expect(normalizeFromEmail('"Biography Library <noreply@biographylibrary.org>"')).toBe(
      'Biography Library <noreply@biographylibrary.org>',
    );
  });

  it('leaves valid values unchanged', () => {
    expect(normalizeFromEmail('Biography Library <noreply@biographylibrary.org>')).toBe(
      'Biography Library <noreply@biographylibrary.org>',
    );
  });
});

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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendTransactionalEmail({
      to: 'user@example.com',
      templateId: 'welcome',
      locale: 'it',
      env: {
        apiKey: 're_test',
        from: '"Biography Library <noreply@biographylibrary.org>"',
      },
    });

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.from).toBe('Biography Library <noreply@biographylibrary.org>');
  });
});
