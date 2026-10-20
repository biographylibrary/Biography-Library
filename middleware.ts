import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { STAFF_ROLES } from '@/lib/server/staff-roles';
import { isMaintenanceAllowlisted, isApiPath } from '@/lib/maintenance/allowlist';
import { fetchMaintenanceEnabled } from '@/lib/maintenance/flag';
import {
  MAINTENANCE_BYPASS_COOKIE,
  createMaintenanceBypassValue,
  maintenanceBypassCookieHeader,
  verifyMaintenanceBypassValue,
} from '@/lib/maintenance/bypass';
import { buildMaintenanceHtml, maintenanceLocaleFromRequest } from '@/lib/maintenance/page';

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function getAccessTokenFromCookies(req: NextRequest): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  let ref: string;
  try {
    ref = new URL(url).hostname.split('.')[0] ?? '';
  } catch {
    return null;
  }
  if (!ref) return null;

  const cookie = req.cookies.get(`sb-${ref}-auth-token`);
  if (!cookie?.value) return null;
  try {
    const parsed = JSON.parse(cookie.value) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

async function resolveStaffContext(
  accessToken: string
): Promise<{ userId: string; role: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return null;

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) return null;

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role ?? 'user';
  return { userId: user.id, role };
}

function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

async function resolveAdminBypass(
  req: NextRequest
): Promise<{ userId: string } | null> {
  const cookieVal = req.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value;
  const fromCookie = await verifyMaintenanceBypassValue(cookieVal);
  if (fromCookie) return fromCookie;

  const token = getBearerToken(req) ?? getAccessTokenFromCookies(req);
  if (!token) return null;

  const ctx = await resolveStaffContext(token);
  if (!ctx || !isAdminRole(ctx.role)) return null;
  return { userId: ctx.userId };
}

function maintenanceResponse(req: NextRequest): NextResponse {
  if (isApiPath(req.nextUrl.pathname)) {
    return NextResponse.json(
      { error: 'maintenance', message: 'Service temporarily unavailable' },
      {
        status: 503,
        headers: {
          'Retry-After': '3600',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  const locale = maintenanceLocaleFromRequest(req.headers, req.headers.get('cookie'));
  return new NextResponse(buildMaintenanceHtml(locale), {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '3600',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

async function attachBypassCookie(
  res: NextResponse,
  userId: string
): Promise<NextResponse> {
  const value = await createMaintenanceBypassValue(userId);
  if (value) {
    res.headers.append('Set-Cookie', maintenanceBypassCookieHeader(value));
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // UM identifier at site root → /id/... (any host: app. or id.)
  // /um-identifier is the public specification page, not an identifier.
  const umRoot =
    pathname === '/um-identifier'
      ? null
      : pathname.match(/^\/(UM|um|Um|uM)([-\s]?[\dA-Za-z][\dA-Za-z\s-]*)$/);
  if (umRoot) {
    const raw = `${umRoot[1]}${umRoot[2]}`.replace(/\s+/g, '');
    const url = req.nextUrl.clone();
    url.pathname = `/id/${raw}`;
    const maintenanceOn = await fetchMaintenanceEnabled();
    if (maintenanceOn) {
      const bypass = await resolveAdminBypass(req);
      if (!bypass) return maintenanceResponse(req);
      return attachBypassCookie(NextResponse.rewrite(url), bypass.userId);
    }
    return NextResponse.rewrite(url);
  }

  if (pathname === '/sw.js' || pathname.startsWith('/workbox-')) {
    if (process.env.NODE_ENV === 'development') {
      const noopSw =
        'self.addEventListener("install",function(e){e.waitUntil(self.skipWaiting())});' +
        'self.addEventListener("activate",function(e){e.waitUntil(self.clients.claim())});';
      return new NextResponse(noopSw, {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  }

  const maintenanceOn = await fetchMaintenanceEnabled();

  if (maintenanceOn && !isMaintenanceAllowlisted(pathname)) {
    const bypass = await resolveAdminBypass(req);
    if (!bypass) return maintenanceResponse(req);
    return attachBypassCookie(NextResponse.next(), bypass.userId);
  }

  if (pathname.startsWith('/api/admin')) {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const ctx = await resolveStaffContext(token);
    if (!ctx || !STAFF_ROLES.has(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (isAdminRole(ctx.role)) {
      return attachBypassCookie(NextResponse.next(), ctx.userId);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    // Session is usually in localStorage (client); when a Supabase auth cookie exists, enforce staff role server-side.
    const token = getBearerToken(req) ?? getAccessTokenFromCookies(req);
    if (token) {
      const ctx = await resolveStaffContext(token);
      if (!ctx || !STAFF_ROLES.has(ctx.role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      if (isAdminRole(ctx.role)) {
        return attachBypassCookie(NextResponse.next(), ctx.userId);
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * All app/API routes except Next internals and common static assets.
     * Favicon / _next / images never hit this middleware (always reachable).
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
