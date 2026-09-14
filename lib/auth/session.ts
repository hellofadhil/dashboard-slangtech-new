export const AUTH_SESSION_COOKIE = 'dashboard_session';
export const AUTH_REFRESH_COOKIE = 'dashboard_refresh';
export const AUTH_SESSION_MAX_AGE = 60 * 55;
export const AUTH_REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
export const AUTH_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;
