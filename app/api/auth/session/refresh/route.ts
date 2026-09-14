import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies';
import { getSafeInternalPath } from '@/lib/auth/redirect';
import { ensureAdminAccess, refreshFirebaseIdToken, verifyFirebaseIdToken } from '@/lib/auth/server';
import { AUTH_REFRESH_COOKIE, AUTH_SESSION_MAX_AGE } from '@/lib/auth/session';

export const runtime = 'nodejs';

function getSafeRedirectPath(request: NextRequest) {
  return getSafeInternalPath(request.nextUrl.searchParams.get('next'), '/login');
}

export async function GET(request: NextRequest) {
  const redirectResponse = NextResponse.redirect(new URL(getSafeRedirectPath(request), request.url));
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return clearAuthCookies(redirectResponse);
  }

  const refreshed = await refreshFirebaseIdToken(refreshToken);
  if (!refreshed) {
    return clearAuthCookies(redirectResponse);
  }

  const user = await verifyFirebaseIdToken(refreshed.idToken);
  if (!user || !(await ensureAdminAccess(user))) {
    return clearAuthCookies(redirectResponse);
  }

  return setAuthCookies(redirectResponse, {
    idToken: refreshed.idToken,
    refreshToken: refreshed.refreshToken,
    sessionMaxAge: Math.min(refreshed.expiresIn, AUTH_SESSION_MAX_AGE),
  });
}
