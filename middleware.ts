import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const STAFF_ROLES = new Set(['reviewer', 'admin', 'super_admin']);

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

async function resolveStaffRole(accessToken: string): Promise<string | null> {
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

  return (profile as { role?: string } | null)?.role ?? 'user';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  if (pathname.startsWith('/api/admin')) {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const role = await resolveStaffRole(token);
    if (!role || !STAFF_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    // Session is usually in localStorage (client); when a Supabase auth cookie exists, enforce staff role server-side.
    const token = getBearerToken(req) ?? getAccessTokenFromCookies(req);
    if (token) {
      const role = await resolveStaffRole(token);
      if (!role || !STAFF_ROLES.has(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/sw.js', '/workbox-:path*', '/admin/:path*', '/api/admin/:path*'],
};
