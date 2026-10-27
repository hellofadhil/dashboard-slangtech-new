import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdminUser } from '@/lib/auth/server';
import {
  getWhatsAppSettings,
  saveWhatsAppSettings,
  toWhatsAppSettingsView,
} from '@/features/whatsapp/data';

export const runtime = 'nodejs';

const updateSettingsSchema = z.object({
  baseUrl: z.string().trim().min(1, 'URL Gateway wajib diisi').url('Format URL tidak valid'),
  userBot: z.string().trim().min(1, 'Nama Bot wajib diisi'),
  apiKey: z.string().trim().min(1, 'API Key WhatsApp wajib diisi'),
  adminPhone: z.string().trim().optional().default(''),
});

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status });
}

export async function GET() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return jsonError('Sesi admin tidak valid atau sudah kedaluwarsa', 401);
  }

  const settings = await getWhatsAppSettings();
  return NextResponse.json({
    success: true,
    data: toWhatsAppSettingsView(settings),
  });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return jsonError('Sesi admin tidak valid atau sudah kedaluwarsa', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      'Data konfigurasi belum valid',
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const saved = await saveWhatsAppSettings(parsed.data, admin.email);
    return NextResponse.json({
      success: true,
      message: 'Pengaturan WhatsApp berhasil disimpan',
      data: toWhatsAppSettingsView(saved),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Gagal menyimpan pengaturan WhatsApp',
      500,
    );
  }
}
