const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 20;

const ipHits = new Map<string, number[]>();

/** True when this IP may file another report. Per server process. */
export function consumeReportIpSlot(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || 'unknown';
  const recent = (ipHits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_IP) {
    ipHits.set(key, recent);
    return false;
  }
  recent.push(now);
  ipHits.set(key, recent);
  return true;
}

export const REPORT_ACCOUNT_WINDOW_MS = WINDOW_MS;
export const REPORT_ACCOUNT_MAX = 8;

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}
