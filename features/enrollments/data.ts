import 'server-only';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore/lite';
import type { DocumentData, UpdateData } from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import { normalizeUserProfileInputData } from '@/features/students/profile-data';
import type {
  AssignEnrollmentScheduleInput,
  ApproveRescheduleRequestInput,
  RejectManualPaymentInput,
  RejectRescheduleRequestInput,
  UpdateEnrollmentSessionStatusInput,
} from '@/features/enrollments/schemas';
import {
  DEFAULT_TIMEZONE,
  ENROLLMENTS_COLLECTION,
  manualPaymentAccount,
} from '@/features/enrollments/utils';
import type {
  ClassEnrollment,
  ClassType,
  EnrollmentClassSnapshot,
  EnrollmentPayment,
  EnrollmentSchedule,
  EnrollmentScheduleSession,
  EnrollmentScheduleStatus,
  EnrollmentStatus,
  GatewayPaymentDetails,
  LocalizedText,
  ManualPaymentDetails,
  PaymentStatus,
  ReschedulePreferredSlot,
  RescheduleRequestStatus,
  ScheduleLocationType,
  ScheduleSessionStatus,
  UserProfile,
} from '@/lib/dashboard/types';

const db = getFirestore(app);

type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

type FirestoreUpdatePayload = UpdateData<DocumentData>;

function nowIso(): string {
  return new Date().toISOString();
}

function cleanFirestoreValue(value: unknown): JsonLike {
  if (value === undefined) {
    return null;
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cleanFirestoreValue);
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, JsonLike>>(
      (clean, [key, entry]) => {
        if (entry !== undefined) {
          clean[key] = cleanFirestoreValue(entry);
        }

        return clean;
      },
      {},
    );
  }

  return null;
}

function cleanFirestoreUpdate(value: Record<string, unknown>): FirestoreUpdatePayload {
  return cleanFirestoreValue(value) as FirestoreUpdatePayload;
}

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

function normalizeClassType(value: unknown): ClassType {
  return value === 'group' ? 'group' : 'private';
}

function normalizeEnrollmentStatus(value: unknown): EnrollmentStatus {
  if (
    value === 'waiting_payment_confirmation' ||
    value === 'confirmed' ||
    value === 'cancelled' ||
    value === 'completed'
  ) {
    return value;
  }

  if (value === 'active') {
    return 'confirmed';
  }

  return 'waiting_payment_confirmation';
}

function normalizePaymentStatus(
  value: unknown,
  method: 'manual',
): Extract<PaymentStatus, 'waiting_confirmation' | 'paid' | 'failed'>;

function normalizePaymentStatus(
  value: unknown,
  method: 'payment_gateway',
): Extract<PaymentStatus, 'pending' | 'paid' | 'failed' | 'expired'>;

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

function normalizeLocationType(value: unknown): ScheduleLocationType {
  return value === 'offline' ? 'offline' : 'online';
}

function normalizeSessionStatus(value: unknown): ScheduleSessionStatus {
  if (value === 'rescheduled' || value === 'completed' || value === 'cancelled') {
    return value;
  }

  return 'scheduled';
}

function normalizeScheduleStatus(value: unknown): EnrollmentScheduleStatus {
  if (
    value === 'assigned' ||
    value === 'reschedule_requested' ||
    value === 'completed' ||
    value === 'cancelled' ||
    value === 'pending_admin_assignment'
  ) {
    return value;
  }

  return 'pending_admin_assignment';
}

function normalizeRescheduleRequestStatus(value: unknown): RescheduleRequestStatus {
  if (value === 'approved' || value === 'rejected' || value === 'cancelled') {
    return value;
  }

  return 'pending_admin_approval';
}

function normalizeManualPaymentDetails(value: unknown): ManualPaymentDetails {
  const data = asRecord(value);

  return {
    bankName: asString(data.bankName, manualPaymentAccount.bankName),
    accountNumber: asString(data.accountNumber, manualPaymentAccount.accountNumber),
    accountHolderName: asString(data.accountHolderName, manualPaymentAccount.accountHolderName),
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

function normalizePayment(value: unknown): EnrollmentPayment {
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

function normalizeClassSnapshot(
  value: unknown,
  fallbackId: string,
  fallbackSlug: string,
): EnrollmentClassSnapshot {
  const data = asRecord(value);
  const name = normalizeLocalizedText(data.name);

  return {
    id: asString(data.id, fallbackId),
    slug: asString(data.slug, fallbackSlug),
    name,
    displayName: asString(data.displayName, name.id || name.en || fallbackSlug),
    type: normalizeClassType(data.type),
    level: asString(data.level),
    price: asNumber(data.price),
    discountPrice: data.discountPrice === null || data.discountPrice === undefined
      ? null
      : asNumber(data.discountPrice),
    selectedPrice: asNumber(data.selectedPrice, asNumber(data.discountPrice, asNumber(data.price))),
    totalSessions: Math.max(asNumber(data.totalSessions, 1), 1),
    sessionDurationMinutes: Math.max(asNumber(data.sessionDurationMinutes, 60), 1),
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

function normalizeSession(value: unknown): EnrollmentScheduleSession {
  const data = asRecord(value);

  return {
    id: asString(data.id),
    sessionNumber: Math.max(asNumber(data.sessionNumber, 1), 1),
    title: asString(data.title, `Session ${asNumber(data.sessionNumber, 1)}`),
    startsAt: toIsoString(data.startsAt),
    endsAt: toIsoString(data.endsAt),
    timezone: asString(data.timezone, DEFAULT_TIMEZONE),
    teacherName: asString(data.teacherName),
    locationType: normalizeLocationType(data.locationType),
    locationLabel: asString(data.locationLabel),
    meetingUrl: asString(data.meetingUrl),
    status: normalizeSessionStatus(data.status),
    notes: asString(data.notes),
  };
}

function normalizePreferredSlot(value: unknown): ReschedulePreferredSlot {
  const data = asRecord(value);

  return {
    startsAt: toIsoString(data.startsAt),
    endsAt: toIsoString(data.endsAt) || null,
    timezone: asString(data.timezone, DEFAULT_TIMEZONE),
    note: asNullableString(data.note),
  };
}

function normalizeRescheduleRequest(value: unknown): EnrollmentSchedule['rescheduleRequest'] {
  const data = asRecord(value);

  if (!Object.keys(data).length) {
    return null;
  }

  const preferredSlots = Array.isArray(data.preferredSlots)
    ? data.preferredSlots.map(normalizePreferredSlot)
    : [];

  return {
    id: asString(data.id),
    status: normalizeRescheduleRequestStatus(data.status),
    requestedBy: asString(data.requestedBy),
    requestedAt: toIsoString(data.requestedAt),
    targetSessionId: asString(data.targetSessionId),
    reason: asString(data.reason),
    preferredSlots,
    adminNote: asNullableString(data.adminNote),
    reviewedBy: asNullableString(data.reviewedBy),
    reviewedAt: asNullableString(data.reviewedAt),
    approvedSession: data.approvedSession ? normalizeSession(data.approvedSession) : null,
  };
}

function normalizeSchedule(value: unknown): EnrollmentSchedule | null {
  const data = asRecord(value);

  if (!Object.keys(data).length) {
    return null;
  }

  const sessions = Array.isArray(data.sessions)
    ? data.sessions.map(normalizeSession).sort((a, b) => a.sessionNumber - b.sessionNumber)
    : [];

  return {
    status: normalizeScheduleStatus(data.status),
    timezone: asString(data.timezone, DEFAULT_TIMEZONE),
    assignedAt: asNullableString(data.assignedAt),
    assignedBy: asNullableString(data.assignedBy),
    startDate: asNullableString(data.startDate),
    sessions,
    rescheduleRequest: normalizeRescheduleRequest(data.rescheduleRequest),
  };
}

function normalizeEnrollment(rawData: unknown, id: string): ClassEnrollment {
  const data = asRecord(rawData);
  const uid = asString(data.uid);
  const classId = asString(data.classId);
  const classSlug = asString(data.classSlug);

  return {
    id: asString(data.id, id),
    uid,
    classId,
    classSlug,
    status: normalizeEnrollmentStatus(data.status ?? data.enrollmentStatus),
    reason: asString(data.reason),
    studentSnapshot: normalizeStudentSnapshot(data.studentSnapshot, uid),
    classSnapshot: normalizeClassSnapshot(data.classSnapshot, classId, classSlug),
    payment: normalizePayment(data.payment),
    schedule: normalizeSchedule(data.schedule),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function isClassEnrollmentData(value: unknown): boolean {
  const data = asRecord(value);
  const hasEventIdentity = Boolean(asString(data.eventId) || Object.keys(asRecord(data.eventSnapshot)).length > 0);
  const hasClassIdentity = Boolean(asString(data.classId) || Object.keys(asRecord(data.classSnapshot)).length > 0);

  return hasClassIdentity && !hasEventIdentity;
}

function normalizeClassEnrollmentDocs(
  enrollmentDocs: Array<{ id: string; data: () => unknown }>,
): ClassEnrollment[] {
  return enrollmentDocs
    .filter((enrollmentDoc) => isClassEnrollmentData(enrollmentDoc.data()))
    .map((enrollmentDoc) => normalizeEnrollment(enrollmentDoc.data(), enrollmentDoc.id));
}

function sortEnrollments(enrollments: ClassEnrollment[]): ClassEnrollment[] {
  return [...enrollments].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
}

function createPendingSchedule(): EnrollmentSchedule {
  return {
    status: 'pending_admin_assignment',
    timezone: DEFAULT_TIMEZONE,
    assignedAt: null,
    assignedBy: null,
    startDate: null,
    sessions: [],
    rescheduleRequest: null,
  };
}

function getEnrollmentRef(enrollmentId: string) {
  return doc(db, ENROLLMENTS_COLLECTION, enrollmentId);
}

async function getExistingEnrollment(enrollmentId: string): Promise<ClassEnrollment> {
  const snapshot = await getDoc(getEnrollmentRef(enrollmentId));

  if (!snapshot.exists()) {
    throw new Error('Enrollment tidak ditemukan');
  }

  if (!isClassEnrollmentData(snapshot.data())) {
    throw new Error('Class enrollment tidak ditemukan');
  }

  return normalizeEnrollment(snapshot.data(), snapshot.id);
}

async function updateEnrollmentDocument(enrollmentId: string, value: Record<string, unknown>): Promise<void> {
  await updateDoc(getEnrollmentRef(enrollmentId), cleanFirestoreUpdate(value));
}

type ReviewableManualPayment = Extract<ClassEnrollment['payment'], { method: 'manual' }> & {
  status: 'waiting_confirmation';
  manual: ManualPaymentDetails;
};

function getReviewableManualPayment(enrollment: ClassEnrollment): ReviewableManualPayment {
  if (enrollment.payment.method !== 'manual') {
    throw new Error('Enrollment ini tidak menggunakan pembayaran manual');
  }

  if (enrollment.payment.status !== 'waiting_confirmation') {
    throw new Error('Pembayaran hanya dapat direview saat status masih waiting_confirmation');
  }

  if (!enrollment.payment.manual) {
    throw new Error('Detail pembayaran manual tidak ditemukan');
  }

  return enrollment.payment as ReviewableManualPayment;
}

function assertScheduleCanBeAssigned(enrollment: ClassEnrollment): void {
  if (enrollment.payment.status !== 'paid' || enrollment.status !== 'confirmed') {
    throw new Error('Jadwal hanya dapat diassign setelah pembayaran paid dan enrollment confirmed');
  }
}

function ensureSessionNumbersAreUnique(sessions: EnrollmentScheduleSession[]): void {
  const sessionNumbers = new Set<number>();

  sessions.forEach((session) => {
    if (sessionNumbers.has(session.sessionNumber)) {
      throw new Error(`Nomor ${session.sessionNumber} digunakan lebih dari sekali`);
    }

    sessionNumbers.add(session.sessionNumber);
  });
}

function assertSessionsAreValid(sessions: EnrollmentScheduleSession[]): void {
  sessions.forEach((session) => {
    const startsAt = new Date(session.startsAt).getTime();
    const endsAt = new Date(session.endsAt).getTime();

    if (Number.isNaN(startsAt) || Number.isNaN(endsAt) || endsAt <= startsAt) {
      throw new Error(`Jadwal ${session.title} belum valid`);
    }

    if (!session.teacherName.trim()) {
      throw new Error(`Teacher ${session.title} wajib diisi`);
    }

    if (!session.locationLabel.trim()) {
      throw new Error(`Lokasi ${session.title} wajib diisi`);
    }

    if (session.locationType === 'online' && !session.meetingUrl.trim()) {
      throw new Error(`Meeting URL ${session.title} wajib diisi`);
    }
  });
}

function prepareScheduleSessions(input: AssignEnrollmentScheduleInput): EnrollmentScheduleSession[] {
  const sessions = input.sessions
    .map<EnrollmentScheduleSession>((session) => ({
      ...session,
      timezone: session.timezone || DEFAULT_TIMEZONE,
      status: 'scheduled',
    }))
    .sort((a, b) => a.sessionNumber - b.sessionNumber);

  ensureSessionNumbersAreUnique(sessions);
  assertSessionsAreValid(sessions);

  return sessions;
}

export async function getClassEnrollments(): Promise<ClassEnrollment[]> {
  try {
    const snapshot = await getDocs(query(
      collection(db, ENROLLMENTS_COLLECTION),
      orderBy('createdAt', 'desc'),
    ));

    return normalizeClassEnrollmentDocs(snapshot.docs);
  } catch {
    const snapshot = await getDocs(collection(db, ENROLLMENTS_COLLECTION));

    return sortEnrollments(normalizeClassEnrollmentDocs(snapshot.docs));
  }
}

export async function getClassEnrollmentById(id: string): Promise<ClassEnrollment | null> {
  const snapshot = await getDoc(getEnrollmentRef(id));

  if (!snapshot.exists() || !isClassEnrollmentData(snapshot.data())) {
    return null;
  }

  return normalizeEnrollment(snapshot.data(), snapshot.id);
}

export async function approveManualEnrollmentPayment(
  enrollmentId: string,
  adminUid: string,
): Promise<ClassEnrollment> {
  const enrollment = await getExistingEnrollment(enrollmentId);
  const payment = getReviewableManualPayment(enrollment);

  if (!payment.manual.proofUrl) {
    throw new Error('Bukti pembayaran belum diunggah');
  }

  const updatedAt = nowIso();

  const updatedEnrollment: ClassEnrollment = {
    ...enrollment,
    status: 'confirmed',
    payment: {
      ...payment,
      status: 'paid',
      adminNote: null,
      reviewedBy: adminUid,
      reviewedAt: updatedAt,
    },
    schedule: enrollment.schedule ?? createPendingSchedule(),
    updatedAt,
  };

  await updateEnrollmentDocument(enrollmentId, {
    status: updatedEnrollment.status,
    payment: updatedEnrollment.payment,
    schedule: updatedEnrollment.schedule,
    updatedAt,
  });

  return updatedEnrollment;
}

export async function rejectManualEnrollmentPayment(
  input: RejectManualPaymentInput & { adminUid: string },
): Promise<ClassEnrollment> {
  const enrollment = await getExistingEnrollment(input.enrollmentId);
  const payment = getReviewableManualPayment(enrollment);

  const updatedAt = nowIso();

  const updatedEnrollment: ClassEnrollment = {
    ...enrollment,
    status: input.nextEnrollmentStatus,
    payment: {
      ...payment,
      status: 'failed',
      adminNote: input.adminNote,
      reviewedBy: input.adminUid,
      reviewedAt: updatedAt,
    },
    updatedAt,
  };

  await updateEnrollmentDocument(input.enrollmentId, {
    status: updatedEnrollment.status,
    payment: updatedEnrollment.payment,
    updatedAt,
  });

  return updatedEnrollment;
}

export async function assignEnrollmentSchedule(
  input: AssignEnrollmentScheduleInput & { adminUid: string },
): Promise<ClassEnrollment> {
  const enrollment = await getExistingEnrollment(input.enrollmentId);

  assertScheduleCanBeAssigned(enrollment);

  const sessions = prepareScheduleSessions(input);
  const assignedAt = nowIso();

  const schedule: EnrollmentSchedule = {
    status: 'assigned',
    timezone: DEFAULT_TIMEZONE,
    assignedAt,
    assignedBy: input.adminUid,
    startDate: sessions[0]?.startsAt ?? null,
    sessions,
    rescheduleRequest: null,
  };

  const updatedEnrollment: ClassEnrollment = {
    ...enrollment,
    schedule,
    updatedAt: assignedAt,
  };

  await updateEnrollmentDocument(input.enrollmentId, {
    schedule,
    updatedAt: assignedAt,
  });

  return updatedEnrollment;
}

export async function updateEnrollmentSessionStatus(
  input: UpdateEnrollmentSessionStatusInput,
): Promise<ClassEnrollment> {
  const enrollment = await getExistingEnrollment(input.enrollmentId);

  if (!enrollment.schedule) {
    throw new Error('Jadwal belum tersedia');
  }

  if (enrollment.status === 'cancelled') {
    throw new Error('Sesi enrollment yang sudah cancelled tidak dapat diubah');
  }

  let foundSession = false;

  const sessions = enrollment.schedule.sessions.map((session) => {
    if (session.id !== input.sessionId) {
      return session;
    }

    foundSession = true;

    return {
      ...session,
      status: input.status,
    };
  });

  if (!foundSession) {
    throw new Error('Sesi tidak ditemukan');
  }

  const allCompleted = sessions.length > 0 && sessions.every((session) => session.status === 'completed');
  const allCancelled = sessions.length > 0 && sessions.every((session) => session.status === 'cancelled');
  const hasPendingReschedule = enrollment.schedule.rescheduleRequest?.status === 'pending_admin_approval';

  const scheduleStatus: EnrollmentScheduleStatus = allCompleted
    ? 'completed'
    : allCancelled
      ? 'cancelled'
      : hasPendingReschedule
        ? 'reschedule_requested'
        : 'assigned';

  const enrollmentStatus: EnrollmentStatus = allCompleted
    ? 'completed'
    : enrollment.status === 'completed'
      ? 'confirmed'
      : enrollment.status;

  const updatedAt = nowIso();

  const schedule: EnrollmentSchedule = {
    ...enrollment.schedule,
    status: scheduleStatus,
    sessions,
  };

  const updatedEnrollment: ClassEnrollment = {
    ...enrollment,
    status: enrollmentStatus,
    schedule,
    updatedAt,
  };

  await updateEnrollmentDocument(input.enrollmentId, {
    status: enrollmentStatus,
    schedule,
    updatedAt,
  });

  return updatedEnrollment;
}

export async function approveEnrollmentRescheduleRequest(
  input: ApproveRescheduleRequestInput & { adminUid: string },
): Promise<ClassEnrollment> {
  const enrollment = await getExistingEnrollment(input.enrollmentId);
  const request = enrollment.schedule?.rescheduleRequest;

  if (!enrollment.schedule || !request) {
    throw new Error('Request reschedule tidak ditemukan');
  }

  if (request.status !== 'pending_admin_approval') {
    throw new Error('Request reschedule sudah direview');
  }

  if (request.targetSessionId !== input.targetSessionId) {
    throw new Error('Sesi target tidak sesuai dengan request reschedule');
  }

  const targetSession = enrollment.schedule.sessions.find(
    (session) => session.id === input.targetSessionId,
  );

  if (!targetSession) {
    throw new Error('Sesi target tidak ditemukan');
  }

  const reviewedAt = nowIso();

  const approvedSession: EnrollmentScheduleSession = {
    ...targetSession,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone || targetSession.timezone || DEFAULT_TIMEZONE,
    teacherName: input.teacherName ?? targetSession.teacherName,
    locationType: input.locationType ?? targetSession.locationType,
    locationLabel: input.locationLabel ?? targetSession.locationLabel,
    meetingUrl: input.meetingUrl ?? targetSession.meetingUrl,
    status: 'rescheduled',
  };

  assertSessionsAreValid([approvedSession]);

  const sessions = enrollment.schedule.sessions.map((session) => (
    session.id === input.targetSessionId ? approvedSession : session
  ));

  const schedule: EnrollmentSchedule = {
    ...enrollment.schedule,
    status: 'assigned',
    sessions,
    rescheduleRequest: {
      ...request,
      status: 'approved',
      reviewedBy: input.adminUid,
      reviewedAt,
      adminNote: input.adminNote,
      approvedSession,
    },
  };

  const updatedEnrollment: ClassEnrollment = {
    ...enrollment,
    schedule,
    updatedAt: reviewedAt,
  };

  await updateEnrollmentDocument(input.enrollmentId, {
    schedule,
    updatedAt: reviewedAt,
  });

  return updatedEnrollment;
}

export async function rejectEnrollmentRescheduleRequest(
  input: RejectRescheduleRequestInput & { adminUid: string },
): Promise<ClassEnrollment> {
  const enrollment = await getExistingEnrollment(input.enrollmentId);
  const request = enrollment.schedule?.rescheduleRequest;

  if (!enrollment.schedule || !request) {
    throw new Error('Request reschedule tidak ditemukan');
  }

  if (request.status !== 'pending_admin_approval') {
    throw new Error('Request reschedule sudah direview');
  }

  const reviewedAt = nowIso();

  const schedule: EnrollmentSchedule = {
    ...enrollment.schedule,
    status: 'assigned',
    rescheduleRequest: {
      ...request,
      status: 'rejected',
      reviewedBy: input.adminUid,
      reviewedAt,
      adminNote: input.adminNote,
    },
  };

  const updatedEnrollment: ClassEnrollment = {
    ...enrollment,
    schedule,
    updatedAt: reviewedAt,
  };

  await updateEnrollmentDocument(input.enrollmentId, {
    schedule,
    updatedAt: reviewedAt,
  });

  return updatedEnrollment;
}
