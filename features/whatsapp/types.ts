export const DEFAULT_WA_BASE_URL = 'https://api-wa.baselab.web.id';
export const DEFAULT_WA_BOT_NAME = 'marketing_bot';
export const DEFAULT_WA_ADMIN_PHONE = '6289514563365';

export interface WhatsAppSettings {
  id: string;
  baseUrl: string;
  userBot: string;
  apiKey: string;
  adminPhone: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface WhatsAppSettingsView {
  baseUrl: string;
  userBot: string;
  apiKey: string;
  adminPhone: string;
  hasApiKey: boolean;
  isConfigured: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SendWhatsAppMessageInput {
  phone: string;
  message: string;
  userBot?: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
}

export interface WhatsAppMessageLogInput {
  phone: string;
  message: string;
  userBot: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
  requestedBy?: string;
  response?: unknown;
}
