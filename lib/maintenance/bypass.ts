export const MAINTENANCE_BYPASS_COOKIE = 'bl_maint_bypass';

const COOKIE_MAX_AGE_SEC = 12 * 60 * 60;

function getSigningSecret(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || null;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  if (typeof atob === 'function') {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Signed cookie value: `userId.exp.sig` (exp = unix seconds). */
export async function createMaintenanceBypassValue(
  userId: string,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<string | null> {
  const secret = getSigningSecret();
  if (!secret || !userId) return null;
  const exp = nowSec + COOKIE_MAX_AGE_SEC;
  const payload = `${userId}.${exp}`;
  const sig = toBase64Url(await hmacSha256(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifyMaintenanceBypassValue(
  value: string | undefined | null,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<{ userId: string } | null> {
  const secret = getSigningSecret();
  if (!secret || !value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  if (!userId || !expStr || !sig) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < nowSec) return null;
  const payload = `${userId}.${expStr}`;
  const expected = await hmacSha256(secret, payload);
  let actual: Uint8Array;
  try {
    actual = fromBase64Url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, actual)) return null;
  return { userId };
}

export function maintenanceBypassCookieHeader(value: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${MAINTENANCE_BYPASS_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SEC}${secure}`;
}
