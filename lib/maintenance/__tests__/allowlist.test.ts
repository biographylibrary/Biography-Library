import { describe, expect, it } from 'vitest';
import { isMaintenanceAllowlisted, isApiPath } from '@/lib/maintenance/allowlist';

describe('isMaintenanceAllowlisted', () => {
  it.each([
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/auth/callback',
    '/admin',
    '/admin/users',
    '/api/admin/maintenance',
    '/api/auth/welcome-email',
    '/api/cron/report-deadlines',
    '/favicon.ico',
    '/_next/static/chunk.js',
    '/sw.js',
  ])('allows %s', (path) => {
    expect(isMaintenanceAllowlisted(path)).toBe(true);
  });

  it.each(['/', '/dashboard', '/biographies', '/api/review/submit', '/settings'])(
    'blocks %s',
    (path) => {
      expect(isMaintenanceAllowlisted(path)).toBe(false);
    }
  );
});

describe('isApiPath', () => {
  it('detects API paths', () => {
    expect(isApiPath('/api/foo')).toBe(true);
    expect(isApiPath('/dashboard')).toBe(false);
  });
});
