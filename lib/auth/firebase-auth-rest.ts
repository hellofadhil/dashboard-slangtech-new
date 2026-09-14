import 'server-only';

import { createSign } from 'crypto';

interface FirebaseSignUpResponse {
  localId?: string;
  email?: string;
}

interface FirebaseErrorResponse {
  error?: {
    message?: string;
  };
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

function getFirebaseApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error('Firebase API key belum dikonfigurasi');
  }

  return apiKey;
}

function getFirebaseProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('Firebase project ID belum dikonfigurasi');
  }

  return projectId;
}

function getFirebaseServiceAccount(): { clientEmail: string; privateKey: string } {
  const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Firebase service account belum dikonfigurasi untuk menghapus akun Auth.');
  }

  return {
    clientEmail,
    privateKey,
  };
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createServiceAccountJwt(): string {
  const serviceAccount = getFirebaseServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const payload = {
    iss: serviceAccount.clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsignedToken = [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(payload)),
  ].join('.');
  const signature = createSign('RSA-SHA256')
    .update(unsignedToken)
    .sign(serviceAccount.privateKey);

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

async function getServiceAccountAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createServiceAccountJwt(),
    }),
  });
  const data = await response.json() as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || 'Gagal mendapatkan akses service account Firebase.');
  }

  return data.access_token;
}

function getReadableFirebaseAuthError(code?: string): string {
  switch (code) {
    case 'EMAIL_EXISTS':
      return 'Email ini sudah terdaftar di Firebase Auth.';
    case 'INVALID_EMAIL':
      return 'Email tidak valid.';
    case 'WEAK_PASSWORD : Password should be at least 6 characters':
    case 'WEAK_PASSWORD':
      return 'Password minimal 6 karakter.';
    case 'OPERATION_NOT_ALLOWED':
      return 'Provider Email/Password belum diaktifkan di Firebase Auth.';
    default:
      return 'Gagal membuat akun Firebase Auth.';
  }
}

function getReadableFirebaseAuthDeleteError(code?: string): string {
  switch (code) {
    case 'USER_NOT_FOUND':
      return 'Akun Firebase Auth guru tidak ditemukan.';
    case 'INSUFFICIENT_PERMISSION':
    case 'PERMISSION_DENIED':
      return 'Service account Firebase tidak punya izin menghapus akun Auth.';
    default:
      return 'Gagal menghapus akun Firebase Auth.';
  }
}

export async function createFirebaseAuthUser(email: string, password: string): Promise<{ uid: string; email: string }> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${getFirebaseApiKey()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: false,
    }),
  });

  const data = await response.json() as FirebaseSignUpResponse & FirebaseErrorResponse;

  if (!response.ok) {
    throw new Error(getReadableFirebaseAuthError(data.error?.message));
  }

  if (!data.localId || !data.email) {
    throw new Error('Firebase Auth tidak mengembalikan data akun.');
  }

  return {
    uid: data.localId,
    email: data.email.trim().toLowerCase(),
  };
}

export async function deleteFirebaseAuthUser(uid: string): Promise<void> {
  const accessToken = await getServiceAccountAccessToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${getFirebaseProjectId()}/accounts:delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      localId: uid,
    }),
  });

  if (response.ok) {
    return;
  }

  const data = await response.json() as FirebaseErrorResponse;
  if (data.error?.message === 'USER_NOT_FOUND') {
    return;
  }

  throw new Error(getReadableFirebaseAuthDeleteError(data.error?.message));
}
