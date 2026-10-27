import 'server-only';

import {
  getWhatsAppSettings,
  saveWhatsAppMessageLog,
  toWhatsAppSettingsView,
} from '@/features/whatsapp/data';
import {
  DEFAULT_WA_BASE_URL,
  DEFAULT_WA_BOT_NAME,
  type SendWhatsAppMessageInput,
  type WhatsAppMessageResult,
} from '@/features/whatsapp/types';

export class WhatsAppApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'WhatsAppApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Normalizes phone number into international digits without leading '+' or '0'.
 * For example:
 * - 089514563365 -> 6289514563365
 * - +6289514563365 -> 6289514563365
 * - 89514563365 -> 6289514563365
 */
export function normalizeWaPhone(input: string): string {
  let cleaned = (input || '').replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = `62${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('8')) {
    cleaned = `62${cleaned}`;
  }

  return cleaned;
}

export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageInput,
  requestedBy = 'system',
): Promise<WhatsAppMessageResult> {
  const storedSettings = await getWhatsAppSettings();
  const activeSettings = toWhatsAppSettingsView(storedSettings);

  const baseUrl = (params.baseUrl || activeSettings.baseUrl || DEFAULT_WA_BASE_URL).replace(/\/+$/, '');
  const userBot = params.userBot || activeSettings.userBot || DEFAULT_WA_BOT_NAME;
  const apiKey = params.apiKey || activeSettings.apiKey;

  if (!apiKey) {
    const errorMsg = 'API Key WhatsApp belum dikonfigurasi. Silakan isi API key di menu WhatsApp Dashboard.';
    await saveWhatsAppMessageLog({
      phone: params.phone,
      message: params.message,
      userBot,
      status: 'failed',
      error: errorMsg,
      requestedBy,
    });
    throw new WhatsAppApiError(errorMsg, 400);
  }

  const phone = normalizeWaPhone(params.phone);
  if (!phone || phone.length < 9) {
    const errorMsg = 'Nomor telepon tujuan tidak valid.';
    await saveWhatsAppMessageLog({
      phone: params.phone,
      message: params.message,
      userBot,
      status: 'failed',
      error: errorMsg,
      requestedBy,
    });
    throw new WhatsAppApiError(errorMsg, 400);
  }

  const endpoint = `${baseUrl}/api/send-message`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        userBot,
        phone,
        message: params.message,
      }),
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    let responseBody: unknown = null;

    if (contentType.includes('application/json')) {
      responseBody = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      responseBody = text ? { raw: text } : {};
    }

    if (!response.ok) {
      const errObj = (typeof responseBody === 'object' && responseBody !== null)
        ? responseBody as Record<string, unknown>
        : {};
      const errorMsg = (typeof errObj.message === 'string' && errObj.message)
        || (typeof errObj.error === 'string' && errObj.error)
        || `Gagal mengirim pesan WhatsApp (HTTP ${response.status})`;

      await saveWhatsAppMessageLog({
        phone,
        message: params.message,
        userBot,
        status: 'failed',
        error: errorMsg,
        requestedBy,
        response: responseBody,
      });

      throw new WhatsAppApiError(errorMsg, response.status, responseBody);
    }

    const dataObj = (typeof responseBody === 'object' && responseBody !== null)
      ? responseBody as Record<string, unknown>
      : {};
    const messageId = typeof dataObj.messageId === 'string'
      ? dataObj.messageId
      : typeof dataObj.id === 'string'
        ? dataObj.id
        : undefined;

    await saveWhatsAppMessageLog({
      phone,
      message: params.message,
      userBot,
      status: 'sent',
      messageId,
      requestedBy,
      response: responseBody,
    });

    return {
      success: true,
      messageId,
      details: responseBody,
    };
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      throw error;
    }

    const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan jaringan saat menghubungi gateway WhatsApp';
    await saveWhatsAppMessageLog({
      phone,
      message: params.message,
      userBot,
      status: 'failed',
      error: errorMsg,
      requestedBy,
    });

    throw new WhatsAppApiError(errorMsg, 502, error);
  }
}
