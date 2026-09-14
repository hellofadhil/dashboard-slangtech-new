import 'server-only';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import {
  EVENT_ENROLLMENTS_COLLECTION,
  createFreeEventPayment,
} from '@/features/event-enrollments/utils';
import { ENROLLMENTS_COLLECTION } from '@/features/enrollments/utils';
import { getEvents } from '@/features/events/data';
import { normalizeUserProfileInputData } from '@/features/students/profile-data';
import type { Event } from '@/features/events/types';
import type {
  EventEnrollment,
  EventEnrollmentEventSnapshot,
  EventEnrollmentPayment,
  EventEnrollmentStatus,
  EventPriceType,
  EventSession,
  EventTrainer,
  GatewayPaymentDetails,
  LocalizedText,
  ManualPaymentDetails,
  PaymentStatus,
  UserProfile,
} from '@/lib/dashboard/types';

const db = getFirestore(app);
const MAX_BATCH_WRITES = 500;
const EVENT_ENROLLMENT_COLLECTIONS = [
  EVENT_ENROLLMENTS_COLLECTION,
  ENROLLMENTS_COLLECTION,
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  const text = asString(value).trim();
  return text ? text : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toIsoString(value: unknown, fallback = ''): string {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return fallback;
}

function getTime(value: unknown): number {
  const date = new Date(toIsoString(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  const data = asRecord(value);

  return {
    id: asString(data.id, typeof value === 'string' ? value : ''),
    en: asString(data.en),
    zh: asString(data.zh),
  };
}

function normalizeEventPriceType(value: unknown): EventPriceType {
  return value === 'paid' ? 'paid' : 'free';
}

function normalizeEventEnrollmentStatus(value: unknown, priceType: EventPriceType): EventEnrollmentStatus {
  if (
    value === 'registered' ||
    value === 'waiting_payment_confirmation' ||
    value === 'confirmed' ||
    value === 'cancelled' ||
    value === 'completed'
  ) {
    return value;
  }

  return priceType === 'free' ? 'confirmed' : 'waiting_payment_confirmation';
}

function normalizeTrainer(value: unknown, index: number): EventTrainer {
  const data = asRecord(value);
  const fallbackName = typeof value === 'string' ? value : '';
  const name = asString(data.name, fallbackName);

  return {
    id: asString(data.id, `${index}`),
    name,
  };
}

function normalizeEventSession(value: unknown, index: number): EventSession {
  const data = asRecord(value);
  const sessionNumber = Math.max(asNumber(data.sessionNumber, index + 1), 1);

  return {
    id: asString(data.id, `session-${sessionNumber}`),
    sessionNumber,
    title: asString(data.title, `Session ${sessionNumber}`),
    startsAt: toIsoString(data.startsAt),
    timezone: asString(data.timezone, 'Asia/Jakarta'),
    notes: asString(data.notes),
  };
}

function createFallbackSessions(data: Record<string, unknown>): EventSession[] {
  const startsAt = toIsoString(data.startsAt);

  if (!startsAt) {
    return [];
  }

  return [{
    id: 'session-1',
    sessionNumber: 1,
    title: 'Session 1',
    startsAt,
    timezone: asString(data.timezone, 'Asia/Jakarta'),
    notes: '',
  }];
}

function normalizeManualPaymentDetails(value: unknown): ManualPaymentDetails {
  const data = asRecord(value);

  return {
    bankName: asString(data.bankName),
    accountNumber: asString(data.accountNumber),
    accountHolderName: asString(data.accountHolderName),
    proofUrl: asString(data.proofUrl),
    proofFileName: asString(data.proofFileName),
    proofContentType: asString(data.proofContentType),
    proofSize: asNumber(data.proofSize),
    uploadedAt: toIsoString(data.uploadedAt),
    uploadResponse: asString(data.uploadResponse),
  };
}

function normalizeGatewayPaymentDetails(value: unknown): GatewayPaymentDetails {
  const data = asRecord(value);

  return {
    provider: asString(data.provider),
    transactionId: asString(data.transactionId),
    paymentUrl: asString(data.paymentUrl),
    expiresAt: toIsoString(data.expiresAt) || undefined,
  };
}

function normalizePaymentStatus(value: unknown, method: 'manual'): Extract<PaymentStatus, 'waiting_confirmation' | 'paid' | 'failed'>;
function normalizePaymentStatus(value: unknown, method: 'payment_gateway'): Extract<PaymentStatus, 'pending' | 'paid' | 'failed' | 'expired'>;
function normalizePaymentStatus(value: unknown, method: 'manual' | 'payment_gateway'): PaymentStatus {
  if (method === 'manual') {
    return value === 'paid' || value === 'failed' || value === 'waiting_confirmation'
      ? value
      : 'waiting_confirmation';
  }

  return value === 'paid' || value === 'failed' || value === 'expired' || value === 'pending'
    ? value
    : 'pending';
}

function normalizePayment(value: unknown, priceType: EventPriceType): EventEnrollmentPayment {
  if (priceType === 'free') {
    return createFreeEventPayment();
  }

  const data = asRecord(value);
  const method = data.method === 'payment_gateway' ? 'payment_gateway' : 'manual';
  const review = {
    adminNote: asNullableString(data.adminNote),
    reviewedBy: asNullableString(data.reviewedBy),
    reviewedAt: asNullableString(data.reviewedAt),
  };

  if (method === 'payment_gateway') {
    return {
      method,
      status: normalizePaymentStatus(data.status, method),
      amount: asNumber(data.amount),
      currency: 'IDR',
      manual: null,
      gateway: normalizeGatewayPaymentDetails(data.gateway),
      ...review,
    };
  }

  return {
    method,
    status: normalizePaymentStatus(data.status, method),
    amount: asNumber(data.amount),
    currency: 'IDR',
    manual: normalizeManualPaymentDetails(data.manual),
    gateway: null,
    ...review,
  };
}

function normalizeEventSnapshot(value: unknown, fallbackId: string, fallbackSlug: string): EventEnrollmentEventSnapshot {
  const data = asRecord(value);
  const name = normalizeLocalizedText(data.name);
  const priceType = normalizeEventPriceType(data.priceType);
  const rawTrainers = Array.isArray(data.trainers) ? data.trainers : [];
  const rawSessions = Array.isArray(data.sessions) ? data.sessions : [];
  const sessions = rawSessions.length
    ? rawSessions.map(normalizeEventSession).filter((session) => session.startsAt)
    : createFallbackSessions(data);

  return {
    id: asString(data.id, fallbackId),
    slug: asString(data.slug, fallbackSlug),
    name,
    displayName: asString(data.displayName, name.id || name.en || fallbackSlug),
    priceType,
    price: priceType === 'free' ? 0 : asNumber(data.price),
    selectedPrice: priceType === 'free' ? 0 : asNumber(data.selectedPrice, asNumber(data.price)),
    startsAt: sessions[0]?.startsAt ?? toIsoString(data.startsAt),
    timezone: asString(data.timezone, 'Asia/Jakarta'),
    trainers: rawTrainers
      .map(normalizeTrainer)
      .filter((trainer) => trainer.name),
    sessions,
  };
}

function normalizeStudentSnapshot(value: unknown, uid: string): Partial<UserProfile> {
  const data = asRecord(value);
  const profile = normalizeUserProfileInputData(data);

  return {
    uid: asString(data.uid, uid),
    ...profile,
    displayName: asString(data.displayName),
  };
}

function normalizeEventEnrollment(rawData: unknown, id: string): EventEnrollment {
  const data = asRecord(rawData);
  const uid = asString(data.uid);
  const eventId = asString(data.eventId);
  const eventSlug = asString(data.eventSlug);
  const eventSnapshot = normalizeEventSnapshot(data.eventSnapshot, eventId, eventSlug);

  return {
    id: asString(data.id, id),
    uid,
    eventId,
    eventSlug,
    status: normalizeEventEnrollmentStatus(data.status, eventSnapshot.priceType),
    reason: asString(data.reason),
    studentSnapshot: normalizeStudentSnapshot(data.studentSnapshot, uid),
    eventSnapshot,
    payment: normalizePayment(data.payment, eventSnapshot.priceType),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function sortEventEnrollments(enrollments: EventEnrollment[]): EventEnrollment[] {
  return [...enrollments].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
}

function normalizeEventEnrollmentDocs(
  enrollmentDocs: Array<{ id: string; data: () => unknown }>,
): EventEnrollment[] {
  const enrollmentsById = new Map<string, EventEnrollment>();

  enrollmentDocs
    .filter((enrollmentDoc) => isEventEnrollmentData(enrollmentDoc.data()))
    .forEach((enrollmentDoc) => {
      if (!enrollmentsById.has(enrollmentDoc.id)) {
        enrollmentsById.set(enrollmentDoc.id, normalizeEventEnrollment(enrollmentDoc.data(), enrollmentDoc.id));
      }
    });

  return sortEventEnrollments([...enrollmentsById.values()]);
}

function getEventEnrollmentRef(enrollmentId: string) {
  return doc(db, EVENT_ENROLLMENTS_COLLECTION, enrollmentId);
}

function isEventEnrollmentData(value: unknown): boolean {
  const data = asRecord(value);
  return Boolean(asString(data.eventId) || Object.keys(asRecord(data.eventSnapshot)).length > 0);
}

function createUpdatedEventSnapshot(
  eventItem: Event,
  currentSnapshot: EventEnrollmentEventSnapshot,
): EventEnrollmentEventSnapshot {
  return {
    ...currentSnapshot,
    id: eventItem.id,
    slug: eventItem.slug,
    name: eventItem.name,
    displayName: eventItem.name.id || eventItem.name.en || eventItem.slug,
    startsAt: eventItem.startsAt,
    timezone: eventItem.timezone,
    trainers: eventItem.trainers,
    sessions: eventItem.sessions,
  };
}

function areSnapshotsEqual(
  snapshot: EventEnrollmentEventSnapshot,
  nextSnapshot: EventEnrollmentEventSnapshot,
): boolean {
  return (
    snapshot.id === nextSnapshot.id &&
    snapshot.slug === nextSnapshot.slug &&
    snapshot.displayName === nextSnapshot.displayName &&
    snapshot.startsAt === nextSnapshot.startsAt &&
    snapshot.timezone === nextSnapshot.timezone &&
    JSON.stringify(snapshot.name) === JSON.stringify(nextSnapshot.name) &&
    JSON.stringify(snapshot.trainers) === JSON.stringify(nextSnapshot.trainers) &&
    JSON.stringify(snapshot.sessions) === JSON.stringify(nextSnapshot.sessions)
  );
}

export async function syncEventEnrollmentSnapshots(eventItem: Event): Promise<number> {
  let syncedCount = 0;

  for (const collectionName of EVENT_ENROLLMENT_COLLECTIONS) {
    const snapshot = await getDocs(query(
      collection(db, collectionName),
      where('eventId', '==', eventItem.id),
    ));

    for (let index = 0; index < snapshot.docs.length; index += MAX_BATCH_WRITES) {
      const enrollmentDocs = snapshot.docs.slice(index, index + MAX_BATCH_WRITES);
      const batch = writeBatch(db);

      enrollmentDocs.forEach((enrollmentDoc) => {
        const enrollment = normalizeEventEnrollment(enrollmentDoc.data(), enrollmentDoc.id);

        batch.update(enrollmentDoc.ref, {
          eventSlug: eventItem.slug,
          eventSnapshot: createUpdatedEventSnapshot(eventItem, enrollment.eventSnapshot),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      syncedCount += enrollmentDocs.length;
    }
  }

  return syncedCount;
}

export async function syncStaleEventEnrollmentSnapshots(): Promise<number> {
  const [events, ...snapshots] = await Promise.all([
    getEvents(),
    ...EVENT_ENROLLMENT_COLLECTIONS.map((collectionName) => getDocs(collection(db, collectionName))),
  ]);
  const eventsById = new Map(events.map((eventItem) => [eventItem.id, eventItem]));
  let syncedCount = 0;
  let batch = writeBatch(db);
  let pendingWrites = 0;

  for (const enrollmentDoc of snapshots.flatMap((snapshot) => snapshot.docs)) {
    if (!isEventEnrollmentData(enrollmentDoc.data())) {
      continue;
    }

    const enrollment = normalizeEventEnrollment(enrollmentDoc.data(), enrollmentDoc.id);
    const eventItem = eventsById.get(enrollment.eventId || enrollment.eventSnapshot.id);

    if (!eventItem) {
      continue;
    }

    const nextEventSnapshot = createUpdatedEventSnapshot(eventItem, enrollment.eventSnapshot);
    const eventSlugChanged = enrollment.eventSlug !== eventItem.slug;
    const eventSnapshotChanged = !areSnapshotsEqual(enrollment.eventSnapshot, nextEventSnapshot);

    if (!eventSlugChanged && !eventSnapshotChanged) {
      continue;
    }

    batch.update(enrollmentDoc.ref, {
      eventSlug: eventItem.slug,
      eventSnapshot: nextEventSnapshot,
      updatedAt: serverTimestamp(),
    });
    pendingWrites += 1;
    syncedCount += 1;

    if (pendingWrites === MAX_BATCH_WRITES) {
      await batch.commit();
      batch = writeBatch(db);
      pendingWrites = 0;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }

  return syncedCount;
}

export async function getEventEnrollments(): Promise<EventEnrollment[]> {
  try {
    const snapshots = await Promise.all(EVENT_ENROLLMENT_COLLECTIONS.map((collectionName) => (
      getDocs(query(
        collection(db, collectionName),
        orderBy('createdAt', 'desc'),
      ))
    )));

    return normalizeEventEnrollmentDocs(snapshots.flatMap((snapshot) => snapshot.docs));
  } catch {
    const snapshots = await Promise.all(EVENT_ENROLLMENT_COLLECTIONS.map((collectionName) => (
      getDocs(collection(db, collectionName))
    )));

    return normalizeEventEnrollmentDocs(snapshots.flatMap((snapshot) => snapshot.docs));
  }
}

export async function getEventEnrollmentsByEventId(eventId: string): Promise<EventEnrollment[]> {
  const enrollments = await getEventEnrollments();

  return enrollments.filter((enrollment) => (
    enrollment.eventId === eventId || enrollment.eventSnapshot.id === eventId
  ));
}

export async function getEventEnrollmentById(id: string): Promise<EventEnrollment | null> {
  const primarySnapshot = await getDoc(getEventEnrollmentRef(id));
  if (primarySnapshot.exists()) {
    return normalizeEventEnrollment(primarySnapshot.data(), primarySnapshot.id);
  }

  const legacySnapshot = await getDoc(doc(db, ENROLLMENTS_COLLECTION, id));
  return legacySnapshot.exists() ? normalizeEventEnrollment(legacySnapshot.data(), legacySnapshot.id) : null;
}
