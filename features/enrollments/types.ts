import type { ClassType } from '@/features/classes/types';
import type { UserProfile } from '@/features/students/types';
import type { LocalizedText } from '@/features/shared/types';

export type PaymentMethod = 'manual' | 'payment_gateway';

export type EnrollmentStatus =
  | 'waiting_payment_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export type PaymentStatus =
  | 'waiting_confirmation'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired';

export type ManualPaymentDetails = {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  senderBankName?: string;
  senderAccountName?: string;
  proofUrl: string;
  proofFileName: string;
  proofContentType: string;
  proofSize: number;
  uploadedAt: string;
  uploadResponse: string;
};

export type GatewayPaymentDetails = {
  provider: string;
  transactionId: string;
  paymentUrl: string;
  expiresAt?: string;
};

export type ScheduleLocationType = 'online' | 'offline';

export type ScheduleSessionStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'completed'
  | 'cancelled';

export type EnrollmentScheduleStatus =
  | 'pending_admin_assignment'
  | 'assigned'
  | 'reschedule_requested'
  | 'completed'
  | 'cancelled';

export type RescheduleRequestStatus =
  | 'pending_admin_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type EnrollmentScheduleSession = {
  id: string;
  sessionNumber: number;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  teacherId?: string;
teacherName: string;
  locationType: ScheduleLocationType;
  locationLabel: string;
  meetingUrl: string;
  status: ScheduleSessionStatus;
  notes: string;
};

export type ReschedulePreferredSlot = {
  startsAt: string;
  endsAt?: string | null;
  timezone: string;
  note?: string | null;
};

export type EnrollmentRescheduleRequest = {
  id: string;
  status: RescheduleRequestStatus;
  requestedBy: string;
  requestedAt: string;
  targetSessionId: string;
  reason: string;
  preferredSlots: ReschedulePreferredSlot[];
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvedSession?: EnrollmentScheduleSession | null;
};

export type EnrollmentSchedule = {
  status: EnrollmentScheduleStatus;
  timezone: string;
  assignedAt?: string | null;
  assignedBy?: string | null;
  startDate?: string | null;
  sessions: EnrollmentScheduleSession[];
  rescheduleRequest?: EnrollmentRescheduleRequest | null;
};

export type EnrollmentPaymentReview = {
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export type EnrollmentPayment =
  | ({
      method: 'manual';
      status: Extract<PaymentStatus, 'waiting_confirmation' | 'paid' | 'failed'>;
      amount: number;
      currency: 'IDR';
      manual: ManualPaymentDetails;
      gateway: null;
    } & EnrollmentPaymentReview)
  | ({
      method: 'payment_gateway';
      status: Extract<PaymentStatus, 'pending' | 'paid' | 'failed' | 'expired'>;
      amount: number;
      currency: 'IDR';
      manual: null;
      gateway: GatewayPaymentDetails;
    } & EnrollmentPaymentReview);

export type EnrollmentClassSnapshot = {
  id: string;
  slug: string;
  name: LocalizedText;
  displayName: string;
  type: ClassType;
  level: string;
  price: number;
  discountPrice: number | null;
  selectedPrice: number;
  totalSessions: number;
  sessionDurationMinutes: number;
};

export type ClassEnrollment = {
  id: string;
  uid: string;
  classId: string;
  classSlug: string;
  status: EnrollmentStatus;
  reason: string;
  studentSnapshot: Partial<UserProfile>;
  classSnapshot: EnrollmentClassSnapshot;
  payment: EnrollmentPayment;
  schedule: EnrollmentSchedule | null;
  createdAt: string;
  updatedAt: string;
};

export type EnrollmentListFilter =
  | 'all'
  | 'payment_review_manual'
  | 'payment_review_gateway'
  | 'paid_enrollments'
  | 'waiting_payment_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'need_schedule_assignment'
  | 'reschedule_requested';

export interface EnrollmentQuery {
  search?: string;
  filter?: EnrollmentListFilter;
}

