import 'server-only';

import type {
  ZawaCreatedSession,
  ZawaMessagePayload,
  ZawaRemoteSession,
  ZawaSessionCredentials,
} from '@/lib/zawa/types';
export type {
  ZawaCreatedSession,
  ZawaMessagePayload,
  ZawaMessageType,
  ZawaRemoteSession,
  ZawaSessionCredentials,
} from '@/lib/zawa/types';

export class ZawaApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ZawaApiError';
    this.status = status;
    this.details = details;
  }
}

const DEFAULT_ZAWA_BASE_URL = 'https://api-zawa.azickri.com';

function getZawaBaseUrl(): string {
  return (process.env.ZAWA_API_BASE_URL || DEFAULT_ZAWA_BASE_URL).replace(/\/+$/, '');
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function normalizeCreatedSession(value: unknown): ZawaCreatedSession {
  const data = asRecord(value);
  const id = asString(data.id);
  const sessionId = asString(data.sessionId) || asString(data['session-id']);

  if (!id || !sessionId) {
    throw new ZawaApiError('Response Zawa tidak berisi session yang valid', 502, value);
  }

  return { id, sessionId };
}

function normalizeRemoteSession(value: unknown): ZawaRemoteSession {
  const data = asRecord(value);
  const createdSession = normalizeCreatedSession(value);

  return {
    ...createdSession,
    isConnected: asBoolean(data.isConnected),
    qrcode: asString(data.qrcode),
  };
}

function getSessionHeaders(credentials: ZawaSessionCredentials): HeadersInit {
  return {
    Accept: 'application/json',
    id: credentials.zawaId,
    'session-id': credentials.sessionId,
  };
}

async function parseZawaResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
}

async function requestZawa(path: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(`${getZawaBaseUrl()}${path}`, init);
  const body = await parseZawaResponse(response);

  if (!response.ok) {
    const data = asRecord(body);
    const message = asString(data.message) || asString(data.error) || 'Request ke Zawa gagal';
    throw new ZawaApiError(message, response.status, body);
  }

  return body;
}

export async function createZawaSession(): Promise<ZawaCreatedSession> {
  const body = await requestZawa('/session', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  return normalizeCreatedSession(body);
}

export async function getZawaSession(credentials: ZawaSessionCredentials): Promise<ZawaRemoteSession> {
  const body = await requestZawa('/session', {
    method: 'GET',
    headers: getSessionHeaders(credentials),
    cache: 'no-store',
  });

  return normalizeRemoteSession(body);
}

export async function resetZawaSession(credentials: ZawaSessionCredentials): Promise<ZawaCreatedSession> {
  const body = await requestZawa('/session', {
    method: 'PUT',
    headers: getSessionHeaders(credentials),
    cache: 'no-store',
  });

  return normalizeCreatedSession({
    sessionId: credentials.sessionId,
    ...asRecord(body),
  });
}

export async function deleteZawaSession(credentials: ZawaSessionCredentials): Promise<ZawaCreatedSession> {
  const body = await requestZawa('/session', {
    method: 'DELETE',
    headers: getSessionHeaders(credentials),
    cache: 'no-store',
  });

  return normalizeCreatedSession({
    sessionId: credentials.sessionId,
    ...asRecord(body),
  });
}

export async function sendZawaMessage(
  credentials: ZawaSessionCredentials,
  payload: ZawaMessagePayload,
): Promise<{ messageId: string }> {
  const body = await requestZawa('/message', {
    method: 'POST',
    headers: {
      ...getSessionHeaders(credentials),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const data = asRecord(body);
  const messageId = asString(data.messageId);

  if (!messageId) {
    throw new ZawaApiError('Response Zawa tidak berisi messageId', 502, body);
  }

  return { messageId };
}
