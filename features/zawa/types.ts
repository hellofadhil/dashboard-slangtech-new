import type { ZawaMessagePayload, ZawaMessageType } from '@/lib/zawa/types';

export type ZawaSessionStatus = 'pending' | 'connected' | 'disconnected' | 'error';

export interface ZawaSessionRecord {
  id: string;
  zawaId: string;
  sessionId: string;
  status: ZawaSessionStatus;
  isConnected: boolean;
  qrcode: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lastSyncedAt: string;
  lastError: string;
  createdBy: string;
  updatedBy: string;
}

export type ZawaMessageStatus = 'sent' | 'failed';

export interface ZawaMessageLogInput {
  status: ZawaMessageStatus;
  payload: ZawaMessagePayload;
  type: ZawaMessageType;
  target: string;
  messageId?: string;
  errorMessage?: string;
  errorStatus?: number;
  requestedBy: string;
  session: {
    zawaId: string;
    sessionId: string;
  };
}

export interface ZawaSessionView {
  id: string;
  sessionId: string;
  isConnected: boolean;
  qrcode: string;
  status: ZawaSessionStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lastSyncedAt: string;
  lastError: string;
}
