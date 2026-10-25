import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { AUTH_REFRESH_COOKIE, AUTH_SESSION_COOKIE } from '@/lib/auth/session';
import {
  createAdminUser,
  getAdminUsersCount,
  isAdminEmailAllowed,
} from '@/lib/firebase/db';

export interface FirebaseSessionUser {
  uid: string;
  email: string;
}

interface FirebaseLookupResponse {
  users?: Array<{
    localId?: string;
    email?: string;
  }>;
}

interface FirebaseRefreshResponse {
  id_token?: string;
  refresh_token?: string;
  expires_in?: string;
}

function getFirebaseApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error('Firebase API key belum dikonfigurasi');
  }

  return apiKey;
}

export const verifyFirebaseIdToken = cache(async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseSessionUser | null> {
  const apiKey = getFirebaseApiKey();

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as FirebaseLookupResponse;
  const user = data.users?.[0];
  const email = user?.email?.trim().toLowerCase();

  if (!user?.localId || !email) {
    return null;
  }

  return {
    uid: user.localId,
    email,
  };
});

export async function refreshFirebaseIdToken(refreshToken: string): Promise<{
  idToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const apiKey = getFirebaseApiKey();
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as FirebaseRefreshResponse;
  const expiresIn = Number(data.expires_in);

  if (!data.id_token || !data.refresh_token || !Number.isFinite(expiresIn)) {
    return null;
  }

  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn,
  };
}

export const ensureAdminAccess = cache(async function ensureAdminAccess(user: FirebaseSessionUser): Promise<boolean> {
  const adminCount = await getAdminUsersCount();

  if (adminCount === 0) {
    await createAdminUser(user.email, user.email);
    return true;
  }

  return isAdminEmailAllowed(user.email);
});

export async function getAuthSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_SESSION_COOKIE)?.value;
}

export async function getAuthRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_REFRESH_COOKIE)?.value;
}

export const getCurrentAdminUser = cache(async function getCurrentAdminUser(): Promise<FirebaseSessionUser | null> {
  const idToken = await getAuthSessionToken();

  if (!idToken) {
    return null;
  }

  const user = await verifyFirebaseIdToken(idToken);
  if (!user) {
    return null;
  }

  const hasAccess = await ensureAdminAccess(user);
  return hasAccess ? user : null;
});
