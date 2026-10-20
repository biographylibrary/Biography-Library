/** Paths always reachable while maintenance mode is on. */
export function isMaintenanceAllowlisted(pathname: string): boolean {
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/verify-email'
  ) {
    return true;
  }
  if (pathname === '/auth' || pathname.startsWith('/auth/')) return true;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) return true;
  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/api/cron' || pathname.startsWith('/api/cron/')) return true;
  if (pathname === '/favicon.ico' || pathname === '/sw.js') return true;
  if (pathname.startsWith('/workbox-')) return true;
  if (pathname.startsWith('/_next/')) return true;
  return false;
}

export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}
