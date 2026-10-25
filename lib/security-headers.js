/**
 * Security response headers for Next.js (`next.config.js` → `headers()`).
 * CSP is Report-Only only — do not flip to enforcing without a console review.
 */

/**
 * @param {string | undefined} supabaseUrl from NEXT_PUBLIC_SUPABASE_URL
 * @returns {string[]}
 */
function supabaseConnectSources(supabaseUrl) {
  if (!supabaseUrl || typeof supabaseUrl !== 'string') return [];
  try {
    const u = new URL(supabaseUrl);
    const origin = `${u.protocol}//${u.host}`;
    const wss = `wss://${u.host}`;
    return [origin, wss];
  } catch {
    return [];
  }
}

/**
 * Browser connect-src hosts actually used by client code:
 * - 'self' for Next.js API routes (/api/*, same origin)
 * - Supabase (Auth, Storage, Realtime, Edge Functions e.g. audio-transcription, log-error)
 * Infomaniak AI, GeoNames and Nominatim are called only from the server — not listed here.
 *
 * @param {{ supabaseUrl?: string }} [opts]
 * @returns {string}
 */
function buildConnectSrc(opts = {}) {
  const parts = ["'self'", ...supabaseConnectSources(opts.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL)];
  return parts.join(' ');
}

/**
 * @param {{ supabaseUrl?: string }} [opts]
 * @returns {{ key: string, value: string }[]}
 */
function buildSecurityHeaders(opts = {}) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${buildConnectSrc(opts)}`,
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  return [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), geolocation=(), payment=(), microphone=(self)',
    },
    {
      key: 'Content-Security-Policy-Report-Only',
      value: csp,
    },
  ];
}

module.exports = {
  buildSecurityHeaders,
  buildConnectSrc,
  supabaseConnectSources,
};
