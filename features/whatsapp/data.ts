import 'server-only';

import {
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import {
  asRecord,
  asString,
  nowIso,
  removeUndefined,
  toIsoString,
  type FirestoreValue,
} from '@/features/shared/firestore-data';
import {
  DEFAULT_WA_ADMIN_PHONE,
  DEFAULT_WA_BASE_URL,
  DEFAULT_WA_BOT_NAME,
  type WhatsAppMessageLogInput,
  type WhatsAppSettings,
  type WhatsAppSettingsView,
} from '@/features/whatsapp/types';

const db = getFirestore(app);
const WHATSAPP_SETTINGS_COLLECTION = 'whatsappSettings';
const WHATSAPP_MESSAGES_COLLECTION = 'whatsappMessages';
const PRIMARY_SETTINGS_DOC_ID = 'primary';

function getPrimarySettingsRef() {
  return doc(db, WHATSAPP_SETTINGS_COLLECTION, PRIMARY_SETTINGS_DOC_ID);
}

function stripUndefined(data: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(data).reduce<Record<string, unknown>>((clean, [key, value]) => {
    if (value !== undefined) {
      clean[key] = value;
    }
    return clean;
  }, {});
}

export function toWhatsAppSettingsView(settings: WhatsAppSettings | null): WhatsAppSettingsView {
  const envBaseUrl = process.env.WA_API_BASE_URL?.trim();
  const envBotName = process.env.WA_BOT_NAME?.trim();
  const envApiKey = process.env.WA_API_KEY?.trim() || process.env.ZAWA_MESSAGE_API_KEY?.trim() || '';
  const envAdminPhone = process.env.WA_ADMIN_PHONE?.trim();

  const baseUrl = settings?.baseUrl?.trim() || envBaseUrl || DEFAULT_WA_BASE_URL;
  const userBot = settings?.userBot?.trim() || envBotName || DEFAULT_WA_BOT_NAME;
  const apiKey = settings?.apiKey?.trim() || envApiKey;
  const adminPhone = settings?.adminPhone?.trim() || envAdminPhone || DEFAULT_WA_ADMIN_PHONE;

  const hasApiKey = Boolean(apiKey);
  const isConfigured = Boolean(baseUrl && userBot && hasApiKey);

  return {
    baseUrl,
    userBot,
    apiKey,
    adminPhone,
    hasApiKey,
    isConfigured,
    updatedAt: settings?.updatedAt || '',
    updatedBy: settings?.updatedBy || '',
  };
}

export async function getWhatsAppSettings(): Promise<WhatsAppSettings | null> {
  try {
    const snapshot = await getDoc(getPrimarySettingsRef());
    if (!snapshot.exists()) {
      return null;
    }

    const data = asRecord(snapshot.data());
    return {
      id: snapshot.id,
      baseUrl: asString(data.baseUrl, DEFAULT_WA_BASE_URL),
      userBot: asString(data.userBot, DEFAULT_WA_BOT_NAME),
      apiKey: asString(data.apiKey, ''),
      adminPhone: asString(data.adminPhone, DEFAULT_WA_ADMIN_PHONE),
      updatedAt: toIsoString(data.updatedAt),
      updatedBy: asString(data.updatedBy, ''),
    };
  } catch (error) {
    console.warn('Failed to fetch WhatsApp settings from Firestore:', error);
    return null;
  }
}

export async function saveWhatsAppSettings(
  input: {
    baseUrl: string;
    userBot: string;
    apiKey: string;
    adminPhone?: string;
  },
  adminEmail: string,
): Promise<WhatsAppSettings> {
  const timestamp = nowIso();
  const cleanBaseUrl = input.baseUrl.trim().replace(/\/+$/, '') || DEFAULT_WA_BASE_URL;
  const cleanBotName = input.userBot.trim() || DEFAULT_WA_BOT_NAME;
  const cleanApiKey = input.apiKey.trim();
  const cleanAdminPhone = (input.adminPhone || '').trim() || DEFAULT_WA_ADMIN_PHONE;

  await setDoc(getPrimarySettingsRef(), {
    id: PRIMARY_SETTINGS_DOC_ID,
    baseUrl: cleanBaseUrl,
    userBot: cleanBotName,
    apiKey: cleanApiKey,
    adminPhone: cleanAdminPhone,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  }, { merge: true });

  return {
    id: PRIMARY_SETTINGS_DOC_ID,
    baseUrl: cleanBaseUrl,
    userBot: cleanBotName,
    apiKey: cleanApiKey,
    adminPhone: cleanAdminPhone,
    updatedAt: timestamp,
    updatedBy: adminEmail,
  };
}

export async function saveWhatsAppMessageLog(input: WhatsAppMessageLogInput): Promise<string> {
  try {
    const ref = doc(collection(db, WHATSAPP_MESSAGES_COLLECTION));
    const responsePayload = removeUndefined(input.response) as FirestoreValue;

    await setDoc(ref, stripUndefined({
      id: ref.id,
      phone: input.phone,
      message: input.message,
      userBot: input.userBot,
      status: input.status,
      messageId: input.messageId || null,
      error: input.error || null,
      requestedBy: input.requestedBy || null,
      response: responsePayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    return ref.id;
  } catch (error) {
    console.warn('Failed to log WhatsApp message to Firestore:', error);
    return '';
  }
}
