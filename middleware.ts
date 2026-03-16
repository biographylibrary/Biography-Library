import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/biography',
  '/create-biography',
  '/autobiography/declaration',
  '/deceased-biography/declaration',
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function getAuthToken(request: NextRequest): string | null {
  const cookies = request.cookies.getAll();
  const authCookie = cookies.find(({ name }) =>
    name.startsWith('sb-') && (
      name.endsWith('-auth-token') ||
      name.match(/-auth-token\.\d+$/) !== null
    )
  );
  if (!authCookie?.value) return null;
  try {
    const parsed = JSON.parse(authCookie.value);
    return parsed?.access_token ?? (typeof parsed === 'string' ? parsed : null);
  } catch {
    return authCookie.value;
  }
}

function isEmailVerified(jwt: string): boolean {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Boolean(payload?.email_confirmed_at || payload?.email_verified);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const token = getAuthToken(request);

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isEmailVerified(token)) {
    return NextResponse.redirect(new URL('/verify-email', request.url));
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
