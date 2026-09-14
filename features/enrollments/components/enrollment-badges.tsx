import { Badge } from '@/components/ui/badge';
import {
  EnrollmentScheduleStatus,
  EnrollmentStatus,
  PaymentStatus,
  RescheduleRequestStatus,
  ScheduleSessionStatus,
} from '@/lib/dashboard/types';
import { getBadgeClass } from '@/lib/dashboard/utils';
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusTone,
  getPaymentStatusLabel,
  getPaymentStatusTone,
  getRescheduleRequestStatusLabel,
  getRescheduleRequestStatusTone,
  getScheduleStatusLabel,
  getScheduleStatusTone,
  getSessionStatusLabel,
  getSessionStatusTone,
} from '@/features/enrollments/utils';

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <Badge variant="outline" className={getBadgeClass(getEnrollmentStatusTone(status))}>
      {getEnrollmentStatusLabel(status)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={getBadgeClass(getPaymentStatusTone(status))}>
      {getPaymentStatusLabel(status)}
    </Badge>
  );
}

export function ScheduleStatusBadge({ status }: { status?: EnrollmentScheduleStatus | null }) {
  return (
    <Badge variant="outline" className={getBadgeClass(getScheduleStatusTone(status))}>
      {getScheduleStatusLabel(status)}
    </Badge>
  );
}

export function SessionStatusBadge({ status }: { status: ScheduleSessionStatus }) {
  return (
    <Badge variant="outline" className={getBadgeClass(getSessionStatusTone(status))}>
      {getSessionStatusLabel(status)}
    </Badge>
  );
}

export function RescheduleRequestStatusBadge({ status }: { status: RescheduleRequestStatus }) {
  return (
    <Badge variant="outline" className={getBadgeClass(getRescheduleRequestStatusTone(status))}>
      {getRescheduleRequestStatusLabel(status)}
    </Badge>
  );
}
