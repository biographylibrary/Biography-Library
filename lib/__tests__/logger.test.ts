// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('logger', () => {
  const endpoint = 'https://proj.supabase.co/functions/v1/log-error';

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('invia Authorization con il token di sessione e non manda userId', async () => {
    window.localStorage.setItem(
      'sb-proj-auth-token',
      JSON.stringify({ access_token: 'session-jwt', user: { id: 'u-1' } })
    );

    const { logError } = await import('../logger');
    await logError('fail', { code: 1 });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(endpoint);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer session-jwt');
    expect(headers.apikey).toBe('anon-key');
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty('userId');
    expect(body.message).toBe('fail');
  });

  it('senza sessione usa la chiave anon come oggi', async () => {
    const { logError } = await import('../logger');
    await logError('anon-path');

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer anon-key');
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty('userId');
  });
});
