import type {
  ClassEnrollment,
  EnrollmentListFilter,
  EnrollmentScheduleStatus,
  EnrollmentStatus,
  PaymentStatus,
  RescheduleRequestStatus,
  ScheduleSessionStatus,
} from '@/lib/dashboard/types';

export const ENROLLMENTS_COLLECTION = 'enrollments';
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';

export const manualPaymentAccount = {
  bankName: 'Bank BCA',
  accountNumber: '1011811944',
  accountHolderName: 'Hannan Azka Tuminem',
} as const;

export type StatusTone = 'green' | 'red' | 'orange' | 'gray' | 'blue' | 'purple' | 'yellow';

export const ENROLLMENT_FILTER_OPTIONS: Array<{
  value: EnrollmentListFilter;
  label: string;
}> = [
  { value: 'payment_review_manual', label: 'Transfer Manual' },
  { value: 'payment_review_gateway', label: 'Pembayaran Otomatis' },
  { value: 'paid_enrollments', label: 'Pembayaran Berhasil' },
  { value: 'need_schedule_assignment', label: 'Atur Jadwal' },
  { value: 'reschedule_requested', label: 'Permintaan Jadwal' },
];

export function getStudentDisplayName(enrollment: ClassEnrollment): string {
  return (
    enrollment.studentSnapshot.fullName ||
    enrollment.studentSnapshot.displayName ||
    enrollment.studentSnapshot.email ||
    enrollment.uid ||
    '-'
  );
}

export function getStudentEmail(enrollment: ClassEnrollment): string {
  return enrollment.studentSnapshot.email || '-';
}

export function getClassDisplayName(enrollment: ClassEnrollment): string {
  return (
    enrollment.classSnapshot.displayName ||
    enrollment.classSnapshot.name.id ||
    enrollment.classSnapshot.name.en ||
    enrollment.classSlug ||
    '-'
  );
}

export function getEnrollmentStatusLabel(status: EnrollmentStatus): string {
  const labels: Record<EnrollmentStatus, string> = {
    waiting_payment_confirmation: 'Menunggu Pembayaran',
    confirmed: 'Terkonfirmasi',
    cancelled: 'Dibatalkan',
    completed: 'Selesai',
  };

  return labels[status];
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    waiting_confirmation: 'Menunggu Dicek',
    pending: 'Menunggu Sistem',
    paid: 'Berhasil',
    failed: 'Gagal',
    expired: 'Expired',
  };

  return labels[status];
}

export function getScheduleStatusLabel(status?: EnrollmentScheduleStatus | null): string {
  if (!status) {
    return 'Belum Diatur';
  }

  const labels: Record<EnrollmentScheduleStatus, string> = {
    pending_admin_assignment: 'Belum Diatur',
    assigned: 'Sudah Diatur',
    reschedule_requested: 'Ada Permintaan',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  return labels[status];
}

export function getSessionStatusLabel(status: ScheduleSessionStatus): string {
  const labels: Record<ScheduleSessionStatus, string> = {
    scheduled: 'Terjadwal',
    rescheduled: 'Dijadwal Ulang',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  return labels[status];
}

export function getRescheduleRequestStatusLabel(status: RescheduleRequestStatus): string {
  const labels: Record<RescheduleRequestStatus, string> = {
    pending_admin_approval: 'Menunggu Review',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
  };

  return labels[status];
}

export function getRescheduleRequestStatusTone(status: RescheduleRequestStatus): StatusTone {
  const tones: Record<RescheduleRequestStatus, StatusTone> = {
    pending_admin_approval: 'orange',
    approved: 'green',
    rejected: 'red',
    cancelled: 'gray',
  };

  return tones[status];
}

export function getEnrollmentStatusTone(status: EnrollmentStatus): StatusTone {
  const tones: Record<EnrollmentStatus, StatusTone> = {
    waiting_payment_confirmation: 'orange',
    confirmed: 'green',
    cancelled: 'red',
    completed: 'green',
  };

  return tones[status];
}

export function getPaymentStatusTone(status: PaymentStatus): StatusTone {
  const tones: Record<PaymentStatus, StatusTone> = {
    waiting_confirmation: 'orange',
    pending: 'orange',
    paid: 'green',
    failed: 'red',
    expired: 'gray',
  };

  return tones[status];
}

export function getScheduleStatusTone(status?: EnrollmentScheduleStatus | null): StatusTone {
  if (!status) {
    return 'gray';
  }

  const tones: Record<EnrollmentScheduleStatus, StatusTone> = {
    pending_admin_assignment: 'orange',
    assigned: 'blue',
    reschedule_requested: 'blue',
    completed: 'green',
    cancelled: 'red',
  };

  return tones[status];
}

export function getSessionStatusTone(status: ScheduleSessionStatus): StatusTone {
  const tones: Record<ScheduleSessionStatus, StatusTone> = {
    scheduled: 'blue',
    rescheduled: 'blue',
    completed: 'green',
    cancelled: 'red',
  };

  return tones[status];
}

export function matchesEnrollmentFilter(
  enrollment: ClassEnrollment,
  filter: EnrollmentListFilter = 'all',
): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'payment_review_manual') {
    return enrollment.payment.method === 'manual' &&
      enrollment.payment.status === 'waiting_confirmation';
  }

  if (filter === 'payment_review_gateway') {
    return enrollment.payment.method === 'payment_gateway' &&
      (
        enrollment.payment.status === 'pending' ||
        enrollment.payment.status === 'failed' ||
        enrollment.payment.status === 'expired' ||
        (enrollment.payment.status === 'paid' && enrollment.status !== 'confirmed')
      );
  }

  if (filter === 'paid_enrollments') {
    return enrollment.payment.status === 'paid' && enrollment.status === 'confirmed';
  }

  if (filter === 'need_schedule_assignment') {
    return enrollment.payment.status === 'paid' &&
      enrollment.status === 'confirmed' &&
      (!enrollment.schedule || enrollment.schedule.status === 'pending_admin_assignment');
  }

  if (filter === 'reschedule_requested') {
    return enrollment.schedule?.status === 'reschedule_requested' ||
      enrollment.schedule?.rescheduleRequest?.status === 'pending_admin_approval';
  }

  return enrollment.status === filter;
}

export function getEnrollmentSearchText(enrollment: ClassEnrollment): string {
  return [
    getStudentDisplayName(enrollment),
    getStudentEmail(enrollment),
    getClassDisplayName(enrollment),
    enrollment.classSlug,
    enrollment.classSnapshot.slug,
  ].filter(Boolean).join(' ').toLowerCase();
}
