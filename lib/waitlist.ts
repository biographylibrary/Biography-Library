export type AccountStatus = 'active' | 'suspended' | 'waitlist';

const STAFF_ROLES = new Set(['reviewer', 'admin', 'super_admin']);

export const GRANT_ACCESS_BATCH_SIZE = 100;

export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && STAFF_ROLES.has(role);
}

const WAITLIST_STAY_EXACT = new Set([
  '/waitlist',
  '/terms-of-service',
  '/privacy-policy',
  '/cookie-policy',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/credits',
  '/um-identifier',
  '/biographies',
]);

export function isWaitlistStayPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (WAITLIST_STAY_EXACT.has(pathname)) return true;
  if (pathname.startsWith('/id/')) return true;
  if (pathname.startsWith('/auth/')) return true;
  if (/^\/biography\/[^/]+\/view(\/|$)/.test(pathname)) return true;
  return false;
}

/** Logged-in waitlist users (not staff) must stay on the holding page, not the editor. */
export function shouldHoldOnWaitlist(params: {
  accountStatus: string | null | undefined;
  role: string | null | undefined;
  pathname: string | null | undefined;
}): boolean {
  if (params.accountStatus !== 'waitlist') return false;
  if (isStaffRole(params.role)) return false;
  return !isWaitlistStayPath(params.pathname);
}

export function postLoginPath(params: {
  accountStatus: string | null | undefined;
  role: string | null | undefined;
}): string {
  if (params.accountStatus === 'waitlist' && !isStaffRole(params.role)) {
    return '/waitlist';
  }
  return '/dashboard';
}

export function classifyGrantTarget(
  status: string | null | undefined
): 'grant' | 'skip_active' | 'skip_other' {
  if (status === 'waitlist') return 'grant';
  if (status === 'active') return 'skip_active';
  return 'skip_other';
}

export function chunkIds(ids: string[], size = GRANT_ACCESS_BATCH_SIZE): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}
