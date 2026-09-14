import type {
  EventPriceType,
  EventSession,
  EventTrainer,
} from '@/features/events/types';
import type {
  EnrollmentPayment,
  PaymentStatus,
} from '@/features/enrollments/types';
import type { UserProfile } from '@/features/students/types';
import type { LocalizedText } from '@/features/shared/types';

export type EventEnrollmentStatus =
  | 'registered'
  | 'waiting_payment_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export type EventEnrollmentEventSnapshot = {
  id: string;
  slug: string;
  name: LocalizedText;
  displayName: string;
  priceType: EventPriceType;
  price: number;
  selectedPrice: number;
  startsAt: string;
  timezone: string;
  trainers: EventTrainer[];
  sessions: EventSession[];
};

export type FreeEventPayment = {
  method: 'free';
  status: 'not_required';
  amount: 0;
  currency: 'IDR';
  manual: null;
  gateway: null;
};

export type PaidEventPayment = EnrollmentPayment;

export type EventEnrollmentPayment = FreeEventPayment | PaidEventPayment;

export type EventEnrollment = {
  id: string;
  uid: string;
  eventId: string;
  eventSlug: string;
  status: EventEnrollmentStatus;
  reason: string;
  studentSnapshot: Partial<UserProfile>;
  eventSnapshot: EventEnrollmentEventSnapshot;
  payment: EventEnrollmentPayment;
  createdAt: string;
  updatedAt: string;
};

export type EventEnrollmentPaymentStatus = PaymentStatus | 'not_required';
