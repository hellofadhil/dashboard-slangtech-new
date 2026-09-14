import 'server-only';

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import type { ZawaCreatedSession, ZawaRemoteSession } from '@/lib/zawa/types';
import {
  asBoolean,
  asRecord,
  asString,
  type FirestoreValue,
  nowIso,
  removeUndefined,
  toIsoString,
} from '@/features/shared/firestore-data';
import type { ZawaMessageLogInput, ZawaSessionRecord, ZawaSessionStatus, ZawaSessionView } from '@/features/zawa/types';

const db = getFirestore(app);
const ZAWA_SESSIONS_COLLECTION = 'zawaSessions';
const ZAWA_MESSAGES_COLLECTION = 'zawaMessages';
const PRIMARY_SESSION_DOC_ID = 'primary';
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

function getPrimarySessionRef() {
  return doc(db, ZAWA_SESSIONS_COLLECTION, PRIMARY_SESSION_DOC_ID);
}

function stripUndefined(data: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(data).reduce<Record<string, unknown>>((clean, [key, value]) => {
    if (value !== undefined) {
      clean[key] = value;
    }
    return clean;
  }, {});
}

function getSessionStatus(isConnected: boolean, qrcode = ''): ZawaSessionStatus {
  if (isConnected) {
    return 'connected';
  }

  return qrcode ? 'pending' : 'disconnected';
}

function normalizeZawaSession(rawData: unknown, id: string): ZawaSessionRecord {
  const data = asRecord(rawData);

  return {
    id,
    zawaId: asString(data.zawaId, asString(data.id)),
    sessionId: asString(data.sessionId),
    status: asString(data.status, 'disconnected') as ZawaSessionStatus,
    isConnected: asBoolean(data.isConnected),
    qrcode: asString(data.qrcode),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    expiresAt: toIsoString(data.expiresAt),
    lastSyncedAt: toIsoString(data.lastSyncedAt),
    lastError: asString(data.lastError),
    createdBy: asString(data.createdBy),
    updatedBy: asString(data.updatedBy),
  };
}

export function toZawaSessionView(session: ZawaSessionRecord): ZawaSessionView {
  return {
    id: session.zawaId,
    sessionId: session.sessionId,
    isConnected: session.isConnected,
    qrcode: session.qrcode,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt,
    lastSyncedAt: session.lastSyncedAt,
    lastError: session.lastError,
  };
}

export async function getZawaSessionRecord(): Promise<ZawaSessionRecord | null> {
  const snapshot = await getDoc(getPrimarySessionRef());
  return snapshot.exists() ? normalizeZawaSession(snapshot.data(), snapshot.id) : null;
}

export async function createZawaSessionRecord(
  session: ZawaCreatedSession,
  adminEmail: string,
): Promise<ZawaSessionRecord> {
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await setDoc(getPrimarySessionRef(), {
    id: PRIMARY_SESSION_DOC_ID,
    zawaId: session.id,
    sessionId: session.sessionId,
    status: 'disconnected',
    isConnected: false,
    qrcode: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt,
    lastSyncedAt: '',
    lastError: '',
    createdBy: adminEmail,
    updatedBy: adminEmail,
  });

  return {
    id: PRIMARY_SESSION_DOC_ID,
    zawaId: session.id,
    sessionId: session.sessionId,
    status: 'disconnected',
    isConnected: false,
    qrcode: '',
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt,
    lastSyncedAt: '',
    lastError: '',
    createdBy: adminEmail,
    updatedBy: adminEmail,
  };
}

export async function updateZawaSessionFromRemote(
  existing: ZawaSessionRecord,
  remoteSession: ZawaRemoteSession,
  adminEmail: string,
): Promise<ZawaSessionRecord> {
  const timestamp = nowIso();
  const qrcode = remoteSession.isConnected ? '' : remoteSession.qrcode;
  const status = getSessionStatus(remoteSession.isConnected, qrcode);

  await updateDoc(getPrimarySessionRef(), {
    zawaId: remoteSession.id,
    sessionId: remoteSession.sessionId,
    status,
    isConnected: remoteSession.isConnected,
    qrcode: qrcode || deleteField(),
    updatedAt: serverTimestamp(),
    lastSyncedAt: serverTimestamp(),
    lastError: deleteField(),
    updatedBy: adminEmail,
  });

  return {
    ...existing,
    zawaId: remoteSession.id,
    sessionId: remoteSession.sessionId,
    status,
    isConnected: remoteSession.isConnected,
    qrcode,
    updatedAt: timestamp,
    lastSyncedAt: timestamp,
    lastError: '',
    updatedBy: adminEmail,
  };
}

export async function markZawaSessionError(
  existing: ZawaSessionRecord,
  message: string,
  adminEmail: string,
): Promise<ZawaSessionRecord> {
  const timestamp = nowIso();

  await updateDoc(getPrimarySessionRef(), {
    status: 'error',
    updatedAt: serverTimestamp(),
    lastSyncedAt: serverTimestamp(),
    lastError: message,
    updatedBy: adminEmail,
  });

  return {
    ...existing,
    status: 'error',
    updatedAt: timestamp,
    lastSyncedAt: timestamp,
    lastError: message,
    updatedBy: adminEmail,
  };
}

export async function deleteZawaSessionRecord(): Promise<void> {
  await deleteDoc(getPrimarySessionRef());
}

export async function saveZawaMessageLog(input: ZawaMessageLogInput): Promise<string> {
  const ref = doc(collection(db, ZAWA_MESSAGES_COLLECTION));
  const payload = removeUndefined(input.payload) as FirestoreValue;

  await setDoc(ref, stripUndefined({
    id: ref.id,
    status: input.status,
    type: input.type,
    target: input.target,
    payload,
    messageId: input.messageId,
    errorMessage: input.errorMessage,
    errorStatus: input.errorStatus,
    requestedBy: input.requestedBy,
    session: input.session,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  return ref.id;
}
