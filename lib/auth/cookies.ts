import 'server-only';

import { NextResponse } from 'next/server';
import {
  AUTH_REFRESH_COOKIE,
  AUTH_REFRESH_MAX_AGE,
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_OPTIONS,
  AUTH_SESSION_MAX_AGE,
} from '@/lib/auth/session';

interface AuthCookieInput {
  idToken: string;
  refreshToken?: string;
  sessionMaxAge?: number;
}

function expireCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, '', {
    ...AUTH_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  });
}

export function setAuthCookies(response: NextResponse, input: AuthCookieInput): NextResponse {
  response.cookies.set(AUTH_SESSION_COOKIE, input.idToken, {
    ...AUTH_SESSION_COOKIE_OPTIONS,
    maxAge: input.sessionMaxAge ?? AUTH_SESSION_MAX_AGE,
  });

  if (input.refreshToken) {
    response.cookies.set(AUTH_REFRESH_COOKIE, input.refreshToken, {
      ...AUTH_SESSION_COOKIE_OPTIONS,
      maxAge: AUTH_REFRESH_MAX_AGE,
    });
  } else {
    expireCookie(response, AUTH_REFRESH_COOKIE);
  }

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  expireCookie(response, AUTH_SESSION_COOKIE);
  expireCookie(response, AUTH_REFRESH_COOKIE);
  return response;
}
