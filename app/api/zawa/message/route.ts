import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdminUser } from '@/lib/auth/server';
import {
  getZawaSession,
  sendZawaMessage,
  ZawaApiError,
} from '@/lib/zawa/client';
import type { ZawaMessagePayload } from '@/lib/zawa/types';
import {
  getZawaSessionRecord,
  saveZawaMessageLog,
  toZawaSessionView,
  updateZawaSessionFromRemote,
} from '@/features/zawa/data';

export const runtime = 'nodejs';

const messageObjectSchema = z.record(z.string(), z.unknown());

const zawaMessageSchema = z.object({
  phone: z.string().trim().min(3).optional(),
  group: z.string().trim().min(3).optional(),
  newsletter: z.string().trim().min(3).optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'location', 'contact']),
  text: z.string().trim().optional(),
  image: messageObjectSchema.optional(),
  video: messageObjectSchema.optional(),
  audio: messageObjectSchema.optional(),
  document: messageObjectSchema.optional(),
  location: messageObjectSchema.optional(),
  contact: messageObjectSchema.optional(),
}).superRefine((value, context) => {
  if (!value.phone && !value.group && !value.newsletter) {
    context.addIssue({
      code: 'custom',
      path: ['phone'],
      message: 'Isi salah satu target: phone, group, atau newsletter',
    });
  }

  if (value.type === 'text' && !value.text) {
    context.addIssue({
      code: 'custom',
      path: ['text'],
      message: 'Text wajib diisi untuk pesan text',
    });
  }
});

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status });
}

function getTarget(payload: ZawaMessagePayload): string {
  return payload.phone || payload.group || payload.newsletter || '';
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getBearerToken(value: string): string {
  const [scheme, token] = value.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token?.trim() ?? '' : '';
}

function getMessageApiKey(request: NextRequest): string {
  return request.headers.get('x-api-key')?.trim() ||
    getBearerToken(request.headers.get('authorization') ?? '');
}

async function getRequester(request: NextRequest): Promise<string | null> {
  const configuredApiKey = process.env.ZAWA_MESSAGE_API_KEY?.trim();
  const requestApiKey = getMessageApiKey(request);

  if (configuredApiKey && requestApiKey && requestApiKey === configuredApiKey) {
    return 'api-key';
  }

  const adminUser = await getCurrentAdminUser();
  return adminUser?.email ?? null;
}

export async function POST(request: NextRequest) {
  const requester = await getRequester(request);

  if (!requester) {
    return jsonError('Sesi admin atau API key tidak valid', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = zawaMessageSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('Payload pesan WhatsApp belum valid', 400, parsed.error.flatten().fieldErrors);
  }

  const payload = parsed.data;
  const session = await getZawaSessionRecord();

  if (!session) {
    return jsonError('Sesi Zawa belum dibuat', 409);
  }

  const credentials = {
    zawaId: session.zawaId,
    sessionId: session.sessionId,
  };

  try {
    const remoteSession = await getZawaSession(credentials);
    const syncedSession = await updateZawaSessionFromRemote(session, remoteSession, requester);

    if (!syncedSession.isConnected) {
      await saveZawaMessageLog({
        status: 'failed',
        payload,
        type: payload.type,
        target: getTarget(payload),
        errorMessage: 'WhatsApp belum terhubung. Scan QR dulu sebelum mengirim pesan.',
        errorStatus: 409,
        requestedBy: requester,
        session: credentials,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'WhatsApp belum terhubung. Scan QR dulu sebelum mengirim pesan.',
          data: toZawaSessionView(syncedSession),
        },
        { status: 409 },
      );
    }

    const result = await sendZawaMessage(credentials, payload);

    await saveZawaMessageLog({
      status: 'sent',
      payload,
      type: payload.type,
      target: getTarget(payload),
      messageId: result.messageId,
      requestedBy: requester,
      session: credentials,
    });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    await saveZawaMessageLog({
      status: 'failed',
      payload,
      type: payload.type,
      target: getTarget(payload),
      errorMessage: getErrorMessage(error, 'Gagal mengirim pesan WhatsApp'),
      errorStatus: error instanceof ZawaApiError ? error.status : undefined,
      requestedBy: requester,
      session: credentials,
    });

    return jsonError(
      getErrorMessage(error, 'Gagal mengirim pesan WhatsApp'),
      error instanceof ZawaApiError ? 502 : 500,
    );
  }
}
