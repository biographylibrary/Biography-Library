import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/biography',
  '/create-biography',
  '/autobiography-declaration',
  '/deceased-biography-declaration',
  '/verify-email',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  if (!isProtected) return NextResponse.next()

  const hasCookie = Array.from(request.cookies.getAll()).some(
    cookie => cookie.name.startsWith('sb-') &&
              cookie.name.endsWith('-auth-token')
  )

  if (!hasCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/biography/:path*',
    '/create-biography/:path*',
    '/autobiography-declaration/:path*',
    '/deceased-biography-declaration/:path*',
    '/verify-email/:path*',
  ],
}
