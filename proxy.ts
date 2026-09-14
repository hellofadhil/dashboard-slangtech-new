import { NextRequest, NextResponse } from 'next/server';
import { AUTH_REFRESH_COOKIE, AUTH_SESSION_COOKIE } from '@/lib/auth/session';

export function proxy(request: NextRequest) {
  const session = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value;
  const loginUrl = new URL('/login', request.url);
  const refreshUrl = new URL('/api/auth/session/refresh', request.url);

  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    const next = request.nextUrl.pathname + request.nextUrl.search;

    if (refreshToken) {
      refreshUrl.searchParams.set('next', next);
      return NextResponse.redirect(refreshUrl);
    }

    loginUrl.searchParams.set('next', next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
