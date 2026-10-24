import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildSecurityHeaders,
  buildConnectSrc,
} = require('../security-headers.js') as {
  buildSecurityHeaders: (opts?: { supabaseUrl?: string }) => { key: string; value: string }[];
  buildConnectSrc: (opts?: { supabaseUrl?: string }) => string;
};

function byKey(headers: { key: string; value: string }[], key: string): string {
  const h = headers.find((x) => x.key === key);
  if (!h) throw new Error(`missing header ${key}`);
  return h.value;
}

describe('security headers', () => {
  it('espone HSTS senza includeSubDomains né preload, e le altre intestazioni richieste', () => {
    const headers = buildSecurityHeaders({
      supabaseUrl: 'https://frycyhvhuifznxzamenn.supabase.co',
    });
    expect(byKey(headers, 'Strict-Transport-Security')).toBe('max-age=31536000');
    expect(byKey(headers, 'X-Content-Type-Options')).toBe('nosniff');
    expect(byKey(headers, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(byKey(headers, 'X-Frame-Options')).toBe('DENY');
    expect(byKey(headers, 'Permissions-Policy')).toBe(
      'camera=(), geolocation=(), payment=(), microphone=(self)'
    );
  });

  it('mette solo CSP Report-Only (mai la bloccante) con connect-src da NEXT_PUBLIC_SUPABASE_URL', () => {
    const headers = buildSecurityHeaders({
      supabaseUrl: 'https://abc.supabase.co',
    });
    const keys = headers.map((h) => h.key);
    expect(keys).toContain('Content-Security-Policy-Report-Only');
    expect(keys).not.toContain('Content-Security-Policy');

    const csp = byKey(headers, 'Content-Security-Policy-Report-Only');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain('img-src \'self\' data: blob: https:');
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).toContain("media-src 'self' blob: data:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain(
      "connect-src 'self' https://abc.supabase.co wss://abc.supabase.co"
    );
    expect(csp).not.toMatch(/api\.infomaniak\.com/);
  });

  it('buildConnectSrc non inventa host se l’URL manca o è invalido', () => {
    expect(buildConnectSrc({ supabaseUrl: undefined })).toBe("'self'");
    expect(buildConnectSrc({ supabaseUrl: 'not-a-url' })).toBe("'self'");
  });

  it('next.config.js registra headers() e spegne X-Powered-By', async () => {
    const config = require('../../next.config.js') as {
      poweredByHeader?: boolean;
      headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
    };
    expect(config.poweredByHeader).toBe(false);
    expect(typeof config.headers).toBe('function');
    const routes = await config.headers!();
    expect(routes).toHaveLength(1);
    expect(routes[0].source).toBe('/:path*');
    const keys = routes[0].headers.map((h) => h.key);
    expect(keys).toContain('Content-Security-Policy-Report-Only');
    expect(keys).not.toContain('Content-Security-Policy');
    expect(keys).toContain('Strict-Transport-Security');
  });
});
