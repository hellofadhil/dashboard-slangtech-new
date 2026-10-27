import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdminUser } from '@/lib/auth/server';
import {
  sendWhatsAppMessage,
  WhatsAppApiError,
} from '@/lib/whatsapp/client';

export const runtime = 'nodejs';

const testMessageSchema = z.object({
  phone: z.string().trim().min(5, 'Nomor WhatsApp tujuan wajib diisi'),
  message: z.string().trim().min(1, 'Pesan uji coba wajib diisi'),
  baseUrl: z.string().trim().optional(),
  userBot: z.string().trim().optional(),
  apiKey: z.string().trim().optional(),
});

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return jsonError('Sesi admin tidak valid atau sudah kedaluwarsa', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = testMessageSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      'Form uji coba belum lengkap',
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const result = await sendWhatsAppMessage(parsed.data, `admin-test:${admin.email}`);
    return NextResponse.json({
      success: true,
      message: 'Pesan WhatsApp uji coba berhasil dikirim!',
      data: result,
    });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError(
      error instanceof Error ? error.message : 'Gagal mengirim pesan uji coba WhatsApp',
      500,
    );
  }
}
