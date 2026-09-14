import 'server-only';

import {
  collection,
  getDocs,
  getFirestore,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import { isThisMonth, isThisWeek, isToday, toDate } from '@/lib/date';
import {
  type DashboardSummary,
  emptyDashboardSummary,
} from '@/lib/dashboard/types';

const db = getFirestore(app);

type CollectionName =
  | 'users'
  | 'classes'
  | 'events'
  | 'enrollments'
  | 'payments'
  | 'schedules'
  | 'rescheduleRequests';

type CollectionRecord = {
  id: string;
  data: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {};
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getNullableString(value: unknown): string | null {
  const text = getString(value).trim();
  return text ? text : null;
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

async function readCollection(name: CollectionName): Promise<CollectionRecord[]> {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    data: asRecord(documentSnapshot.data()),
  }));
}

function getScheduleDate(data: Record<string, unknown>): Date | null {
  return toDate(data.startsAt ?? data.date ?? data.startDate ?? data.scheduledAt);
}

function getDateValue(data: Record<string, unknown>, primary: string, fallback?: string): Date | null {
  return toDate(data[primary] ?? (fallback ? data[fallback] : null));
}

function getPaymentAmount(data: Record<string, unknown>): number {
  return getNumber(
    data.amount,
    getNumber(data.totalAmount, getNumber(data.total, 0)),
  );
}

function hasNestedRecord(data: Record<string, unknown>, key: string): boolean {
  return Object.keys(asRecord(data[key])).length > 0;
}

function isClassEnrollmentRecord(enrollment: CollectionRecord): boolean {
  const hasEventIdentity = Boolean(
    getNullableString(enrollment.data.eventId) || hasNestedRecord(enrollment.data, 'eventSnapshot'),
  );
  const hasClassIdentity = Boolean(
    getNullableString(enrollment.data.classId) || hasNestedRecord(enrollment.data, 'classSnapshot'),
  );

  return hasClassIdentity && !hasEventIdentity;
}

function summarizeStudents(users: CollectionRecord[]): DashboardSummary['students'] {
  return users.reduce<DashboardSummary['students']>((summary, user) => {
    const role = getString(user.data.role).trim().toLowerCase();
    const isStudent = role === 'student' || role === '';
    if (!isStudent) {
      return summary;
    }

    summary.total += 1;
    summary.incompleteProfiles += getBoolean(user.data.isProfileComplete) ? 0 : 1;
    summary.newThisMonth += isThisMonth(user.data.createdAt) ? 1 : 0;

    return summary;
  }, { ...emptyDashboardSummary.students });
}

function summarizeClasses(classes: CollectionRecord[]): DashboardSummary['classes'] {
  return classes.reduce<DashboardSummary['classes']>((summary, classItem) => {
    const type = getString(classItem.data.type);
    const isActive = getBoolean(classItem.data.isActive);

    summary.total += 1;
    summary.active += isActive ? 1 : 0;
    summary.inactive += isActive ? 0 : 1;
    summary.featured += getBoolean(classItem.data.isFeatured) ? 1 : 0;
    summary.private += type === 'private' ? 1 : 0;
    summary.group += type === 'group' ? 1 : 0;

    return summary;
  }, { ...emptyDashboardSummary.classes });
}

function summarizeEnrollments(
  enrollments: CollectionRecord[],
  schedules: CollectionRecord[],
): DashboardSummary['enrollments'] {
  const scheduledEnrollmentIds = new Set(
    schedules
      .map((schedule) => getNullableString(schedule.data.enrollmentId))
      .filter((id): id is string => Boolean(id)),
  );
  const canResolveWaitingSchedule = schedules.length > 0 && scheduledEnrollmentIds.size > 0;

  return enrollments.filter(isClassEnrollmentRecord).reduce<DashboardSummary['enrollments']>((summary, enrollment) => {
    const status = getString(enrollment.data.status, getString(enrollment.data.enrollmentStatus, 'unknown'));
    const schedule = asRecord(enrollment.data.schedule);
    const scheduleStatus = getString(schedule.status);

    summary.total += 1;
    summary.pending += status === 'pending' || status === 'waiting_payment_confirmation' ? 1 : 0;
    summary.active += status === 'active' || status === 'confirmed' ? 1 : 0;
    summary.completed += status === 'completed' ? 1 : 0;
    summary.cancelled += status === 'cancelled' ? 1 : 0;
    summary.newThisMonth += isThisMonth(enrollment.data.createdAt) ? 1 : 0;

    if (
      status === 'confirmed' &&
      (!Object.keys(schedule).length || scheduleStatus === 'pending_admin_assignment')
    ) {
      summary.waitingForSchedule += 1;
    } else if (canResolveWaitingSchedule && status === 'active' && !scheduledEnrollmentIds.has(enrollment.id)) {
      summary.waitingForSchedule += 1;
    }

    return summary;
  }, { ...emptyDashboardSummary.enrollments });
}

function summarizeEvents(events: CollectionRecord[]): DashboardSummary['events'] {
  const now = Date.now();

  return events.reduce<DashboardSummary['events']>((summary, eventItem) => {
    const priceType = getString(eventItem.data.priceType, 'free');
    const isActive = getBoolean(eventItem.data.isActive, true);
    const startsAt = toDate(eventItem.data.startsAt);

    summary.total += 1;
    summary.active += isActive ? 1 : 0;
    summary.inactive += isActive ? 0 : 1;
    summary.featured += getBoolean(eventItem.data.isFeatured) ? 1 : 0;
    summary.free += priceType === 'free' ? 1 : 0;
    summary.paid += priceType === 'paid' ? 1 : 0;
    summary.upcoming += startsAt && startsAt.getTime() >= now ? 1 : 0;

    return summary;
  }, { ...emptyDashboardSummary.events });
}

function getPaymentRecords(
  payments: CollectionRecord[],
  enrollments: CollectionRecord[],
): CollectionRecord[] {
  const enrollmentPayments = enrollments
    .filter(isClassEnrollmentRecord)
    .filter((enrollment) => hasNestedRecord(enrollment.data, 'payment'))
    .map<CollectionRecord>((enrollment) => {
      const payment = asRecord(enrollment.data.payment);

      return {
        id: enrollment.id,
        data: {
          ...payment,
          updatedAt: payment.updatedAt ?? enrollment.data.updatedAt,
          createdAt: payment.createdAt ?? enrollment.data.createdAt,
        },
      };
    });

  return enrollmentPayments.length > 0 ? enrollmentPayments : payments;
}

function summarizePayments(
  payments: CollectionRecord[],
  enrollments: CollectionRecord[],
): DashboardSummary['payments'] {
  return getPaymentRecords(payments, enrollments).reduce<DashboardSummary['payments']>((summary, payment) => {
    const status = getString(payment.data.status, 'unknown');
    const method = getString(payment.data.method);
    const manual = asRecord(payment.data.manual);
    const paidDate = getDateValue(payment.data, 'paidAt', 'updatedAt');
    const isPaidThisMonth = status === 'paid' && isThisMonth(paidDate);

    summary.total += 1;
    summary.unpaid += status === 'unpaid' ? 1 : 0;
    summary.pending += status === 'pending' || status === 'waiting_confirmation' ? 1 : 0;
    summary.paid += status === 'paid' ? 1 : 0;
    summary.rejected += status === 'rejected' ? 1 : 0;
    summary.expired += status === 'expired' ? 1 : 0;
    summary.failed += status === 'failed' ? 1 : 0;
    summary.cancelled += status === 'cancelled' ? 1 : 0;
    summary.refunded += status === 'refunded' ? 1 : 0;
    summary.revenueThisMonth += isPaidThisMonth ? getPaymentAmount(payment.data) : 0;
    summary.paidThisMonth += isPaidThisMonth ? 1 : 0;

    if (
      (method === 'manual' || method === 'manual_transfer') &&
      (status === 'waiting_confirmation' || status === 'pending') &&
      (getNullableString(manual.proofUrl) || getNullableString(payment.data.proofUrl))
    ) {
      summary.pendingManualReview += 1;
    }

    return summary;
  }, { ...emptyDashboardSummary.payments });
}

function getScheduleRecords(
  schedules: CollectionRecord[],
  enrollments: CollectionRecord[],
): CollectionRecord[] {
  const enrollmentSchedules = enrollments.flatMap<CollectionRecord>((enrollment) => {
    if (!isClassEnrollmentRecord(enrollment)) {
      return [];
    }

    const schedule = asRecord(enrollment.data.schedule);
    const sessions = Array.isArray(schedule.sessions) ? schedule.sessions : [];

    return sessions.map((session, index) => ({
      id: `${enrollment.id}-${index}`,
      data: asRecord(session),
    }));
  });

  return enrollmentSchedules.length > 0 ? enrollmentSchedules : schedules;
}

function summarizeSchedules(
  schedules: CollectionRecord[],
  enrollments: CollectionRecord[],
): DashboardSummary['schedules'] {
  return getScheduleRecords(schedules, enrollments).reduce<DashboardSummary['schedules']>((summary, schedule) => {
    const status = getString(schedule.data.status, 'unknown');
    const date = getScheduleDate(schedule.data);

    summary.total += 1;
    summary.today += isToday(date) ? 1 : 0;
    summary.upcomingThisWeek += isThisWeek(date) && status !== 'completed' && status !== 'cancelled' ? 1 : 0;
    summary.completedThisMonth += status === 'completed' && isThisMonth(date) ? 1 : 0;
    summary.cancelledThisMonth += status === 'cancelled' && isThisMonth(date) ? 1 : 0;

    return summary;
  }, { ...emptyDashboardSummary.schedules });
}

function getRescheduleRequestRecords(
  requests: CollectionRecord[],
  enrollments: CollectionRecord[],
): CollectionRecord[] {
  const enrollmentRequests = enrollments
    .filter(isClassEnrollmentRecord)
    .map((enrollment) => asRecord(asRecord(enrollment.data.schedule).rescheduleRequest))
    .filter((request) => Object.keys(request).length > 0)
    .map<CollectionRecord>((request) => ({
      id: getString(request.id),
      data: request,
    }));

  return enrollmentRequests.length > 0 ? enrollmentRequests : requests;
}

function summarizeRescheduleRequests(
  requests: CollectionRecord[],
  enrollments: CollectionRecord[],
): DashboardSummary['rescheduleRequests'] {
  return getRescheduleRequestRecords(requests, enrollments).reduce<DashboardSummary['rescheduleRequests']>((summary, request) => {
    const status = getString(request.data.status, 'unknown');
    const activityDate = toDate(request.data.reviewedAt ?? request.data.updatedAt ?? request.data.requestedAt ?? request.data.createdAt);

    summary.total += 1;
    summary.pending += status === 'pending' || status === 'pending_admin_approval' ? 1 : 0;
    summary.approvedThisMonth += status === 'approved' && isThisMonth(activityDate) ? 1 : 0;
    summary.rejectedThisMonth += status === 'rejected' && isThisMonth(activityDate) ? 1 : 0;

    return summary;
  }, { ...emptyDashboardSummary.rescheduleRequests });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    users,
    classes,
    events,
    enrollments,
    payments,
    schedules,
    rescheduleRequests,
  ] = await Promise.all([
    readCollection('users'),
    readCollection('classes'),
    readCollection('events'),
    readCollection('enrollments'),
    readCollection('payments'),
    readCollection('schedules'),
    readCollection('rescheduleRequests'),
  ]);

  return {
    students: summarizeStudents(users),
    classes: summarizeClasses(classes),
    events: summarizeEvents(events),
    enrollments: summarizeEnrollments(enrollments, schedules),
    payments: summarizePayments(payments, enrollments),
    schedules: summarizeSchedules(schedules, enrollments),
    rescheduleRequests: summarizeRescheduleRequests(rescheduleRequests, enrollments),
  };
}
