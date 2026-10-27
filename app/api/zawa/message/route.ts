import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdminUser } from '@/lib/auth/server';
import {
  sendWhatsAppMessage,
  WhatsAppApiError,
} from '@/lib/whatsapp/client';

export const runtime = 'nodejs';

const zawaMessageSchema = z.object({
  phone: z.string().trim().min(3).optional(),
  group: z.string().trim().min(3).optional(),
  newsletter: z.string().trim().min(3).optional(),
  type: z.string().optional(),
  text: z.string().trim().optional(),
  message: z.string().trim().optional(),
}).superRefine((value, context) => {
  if (!value.phone && !value.group && !value.newsletter) {
    context.addIssue({
      code: 'custom',
      path: ['phone'],
      message: 'Isi salah satu target: phone, group, atau newsletter',
    });
  }

  if (!value.text && !value.message) {
    context.addIssue({
      code: 'custom',
      path: ['text'],
      message: 'Text atau pesan wajib diisi',
    });
  }
});

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status });
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
  const configuredApiKey = process.env.WA_API_KEY?.trim() || process.env.ZAWA_MESSAGE_API_KEY?.trim();
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

  const phone = parsed.data.phone || parsed.data.group || parsed.data.newsletter || '';
  const messageText = parsed.data.message || parsed.data.text || '';

  try {
    const result = await sendWhatsAppMessage(
      {
        phone,
        message: messageText,
      },
      `zawa-adapter:${requester}`,
    );

    return NextResponse.json({
      success: true,
      messageId: result.messageId || 'sent',
      data: result.details,
    });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError(
      error instanceof Error ? error.message : 'Gagal mengirim pesan WhatsApp',
      500,
    );
  }
}
