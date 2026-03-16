import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/biography',
  '/create-biography',
  '/autobiography/declaration',
  '/deceased-biography/declaration',
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function hasSupabaseSession(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  return cookies.some((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token') && cookie.value.length > 0);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname) && !hasSupabaseSession(request)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/biography/:path*',
    '/create-biography/:path*',
    '/autobiography/declaration/:path*',
    '/deceased-biography/declaration/:path*',
  ],
};
