import type {
  EventEnrollment,
  EventEnrollmentStatus,
  EventPriceType,
  FreeEventPayment,
  PaymentStatus,
} from '@/lib/dashboard/types';

export const EVENT_ENROLLMENTS_COLLECTION = 'eventEnrollments';

export function createFreeEventPayment(): FreeEventPayment {
  return {
    method: 'free',
    status: 'not_required',
    amount: 0,
    currency: 'IDR',
    manual: null,
    gateway: null,
  };
}

export function getInitialEventEnrollmentStatus(priceType: EventPriceType): EventEnrollmentStatus {
  return priceType === 'free' ? 'confirmed' : 'waiting_payment_confirmation';
}

export function getEventEnrollmentPaymentStatus(enrollment: EventEnrollment): PaymentStatus | 'not_required' {
  return enrollment.payment.status;
}

export function isFreeEventEnrollment(enrollment: EventEnrollment): boolean {
  return enrollment.eventSnapshot.priceType === 'free' || enrollment.payment.method === 'free';
}
