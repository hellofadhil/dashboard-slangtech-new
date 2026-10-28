import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdminUser } from '@/lib/auth/server';
import {
  sendWhatsAppMessage,
  WhatsAppApiError,
} from '@/lib/whatsapp/client';

export const runtime = 'nodejs';

const waMessageSchema = z.object({
  phone: z.string().trim().min(5, 'Nomor telepon wajib diisi'),
  message: z.string().trim().optional(),
  text: z.string().trim().optional(),
  userBot: z.string().trim().optional(),
}).superRefine((val, ctx) => {
  if (!val.message && !val.text) {
    ctx.addIssue({
      code: 'custom',
      path: ['message'],
      message: 'Pesan wajib diisi (isi field message atau text)',
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
  const configuredApiKey = process.env.WA_API_KEY?.trim();
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
  const parsed = waMessageSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('Payload pesan WhatsApp belum valid', 400, parsed.error.flatten().fieldErrors);
  }

  const messageText = parsed.data.message || parsed.data.text || '';

  try {
    const result = await sendWhatsAppMessage(
      {
        phone: parsed.data.phone,
        message: messageText,
        userBot: parsed.data.userBot,
      },
      requester,
    );

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
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
