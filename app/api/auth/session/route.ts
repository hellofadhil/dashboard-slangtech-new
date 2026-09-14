import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies';
import { getSafeInternalPath } from '@/lib/auth/redirect';
import { AUTH_SESSION_MAX_AGE } from '@/lib/auth/session';
import { ensureAdminAccess, verifyFirebaseIdToken } from '@/lib/auth/server';

export const runtime = 'nodejs';

function getSafeRedirectPath(request: NextRequest) {
  return getSafeInternalPath(request.nextUrl.searchParams.get('next'), '/login');
}

export async function GET(request: NextRequest) {
  return clearAuthCookies(
    NextResponse.redirect(new URL(getSafeRedirectPath(request), request.url)),
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { idToken?: string; refreshToken?: string };

    if (!body.idToken) {
      return NextResponse.json({ success: false, message: 'Token login wajib diisi' }, { status: 400 });
    }

    const user = await verifyFirebaseIdToken(body.idToken);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Token login tidak valid' }, { status: 401 });
    }

    const hasAccess = await ensureAdminAccess(user);
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Akun ini bukan administrator. Guru dan siswa silakan masuk melalui website client.' }, { status: 403 });
    }

    return setAuthCookies(
      NextResponse.json({ success: true }),
      {
        idToken: body.idToken,
        refreshToken: body.refreshToken,
        sessionMaxAge: AUTH_SESSION_MAX_AGE,
      },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal membuat sesi login' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  return clearAuthCookies(NextResponse.json({ success: true }));
}
