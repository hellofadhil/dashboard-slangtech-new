'use server';

import { getCurrentAdminUser } from '@/lib/auth/server';
import {
  ApproveManualPaymentSchema,
  ApproveRescheduleRequestSchema,
  AssignEnrollmentScheduleSchema,
  RejectManualPaymentSchema,
  RejectRescheduleRequestSchema,
  UpdateEnrollmentSessionStatusSchema,
} from '@/features/enrollments/schemas';
import {
  approveEnrollmentRescheduleRequest,
  approveManualEnrollmentPayment,
  assignEnrollmentSchedule,
  rejectEnrollmentRescheduleRequest,
  rejectManualEnrollmentPayment,
  updateEnrollmentSessionStatus,
} from '@/features/enrollments/data';
import { sendPaymentConfirmationEmail } from '@/features/enrollments/payment-confirmation-email';
import { sendPaymentConfirmationWhatsApp } from '@/features/enrollments/payment-confirmation-whatsapp';
import type { ClassEnrollment } from '@/features/enrollments/types';
import type { ActionResult } from '@/features/shared/types';
import {
  getActionErrorMessage,
  revalidateEnrollmentPaths,
  validationError,
} from '@/features/shared/action-utils';

export async function approveManualPaymentAction(input: unknown): Promise<ActionResult<ClassEnrollment>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<ClassEnrollment>('Sesi admin tidak valid');
    }

    const parsed = ApproveManualPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<ClassEnrollment>('Data pembayaran belum valid', parsed.error.flatten().fieldErrors);
    }

    const enrollment = await approveManualEnrollmentPayment(parsed.data.enrollmentId, currentAdmin.uid);
    let emailWarning: string | null = null;

    try {
      await sendPaymentConfirmationEmail(enrollment);
    } catch (error) {
      emailWarning = getActionErrorMessage(error, 'Email konfirmasi belum berhasil dikirim');
    }

    let waWarning: string | null = null;
    try {
      await sendPaymentConfirmationWhatsApp(enrollment);
    } catch (error) {
      waWarning = getActionErrorMessage(error, 'WhatsApp konfirmasi belum berhasil dikirim');
    }

    revalidateEnrollmentPaths(enrollment.id);
    const warnings = [emailWarning, waWarning].filter(Boolean);
    return {
      success: true,
      message: warnings.length > 0
        ? `Pembayaran berhasil disetujui, tapi ${warnings.join(' dan ').toLowerCase()}`
        : 'Pembayaran berhasil disetujui. Notifikasi email dan WhatsApp telah dikirim ke siswa.',
      data: enrollment,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, 'Gagal menyetujui pembayaran'),
    };
  }
}

export async function rejectManualPaymentAction(input: unknown): Promise<ActionResult<ClassEnrollment>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<ClassEnrollment>('Sesi admin tidak valid');
    }

    const parsed = RejectManualPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<ClassEnrollment>('Data penolakan pembayaran belum valid', parsed.error.flatten().fieldErrors);
    }

    const enrollment = await rejectManualEnrollmentPayment({
      ...parsed.data,
      adminUid: currentAdmin.uid,
    });
    revalidateEnrollmentPaths(enrollment.id);
    return { success: true, message: 'Pembayaran berhasil ditolak', data: enrollment };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, 'Gagal menolak pembayaran'),
    };
  }
}

export async function assignEnrollmentScheduleAction(input: unknown): Promise<ActionResult<ClassEnrollment>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<ClassEnrollment>('Sesi admin tidak valid');
    }

    const parsed = AssignEnrollmentScheduleSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<ClassEnrollment>('Data jadwal belum valid', parsed.error.flatten().fieldErrors);
    }

    const enrollment = await assignEnrollmentSchedule({
      ...parsed.data,
      adminUid: currentAdmin.uid,
    });
    revalidateEnrollmentPaths(enrollment.id);
    return { success: true, message: 'Jadwal berhasil diassign', data: enrollment };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, 'Gagal mengassign jadwal'),
    };
  }
}

export async function updateEnrollmentSessionStatusAction(input: unknown): Promise<ActionResult<ClassEnrollment>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<ClassEnrollment>('Sesi admin tidak valid');
    }

    const parsed = UpdateEnrollmentSessionStatusSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<ClassEnrollment>('Data status sesi belum valid', parsed.error.flatten().fieldErrors);
    }

    const enrollment = await updateEnrollmentSessionStatus(parsed.data);
    revalidateEnrollmentPaths(enrollment.id);
    return { success: true, message: 'Status sesi berhasil diperbarui', data: enrollment };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, 'Gagal memperbarui status sesi'),
    };
  }
}

export async function approveRescheduleRequestAction(input: unknown): Promise<ActionResult<ClassEnrollment>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<ClassEnrollment>('Sesi admin tidak valid');
    }

    const parsed = ApproveRescheduleRequestSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<ClassEnrollment>('Data approval reschedule belum valid', parsed.error.flatten().fieldErrors);
    }

    const enrollment = await approveEnrollmentRescheduleRequest({
      ...parsed.data,
      adminUid: currentAdmin.uid,
    });
    revalidateEnrollmentPaths(enrollment.id);
    return { success: true, message: 'Request reschedule berhasil disetujui', data: enrollment };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, 'Gagal menyetujui request reschedule'),
    };
  }
}

export async function rejectRescheduleRequestAction(input: unknown): Promise<ActionResult<ClassEnrollment>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<ClassEnrollment>('Sesi admin tidak valid');
    }

    const parsed = RejectRescheduleRequestSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<ClassEnrollment>('Data penolakan reschedule belum valid', parsed.error.flatten().fieldErrors);
    }

    const enrollment = await rejectEnrollmentRescheduleRequest({
      ...parsed.data,
      adminUid: currentAdmin.uid,
    });
    revalidateEnrollmentPaths(enrollment.id);
    return { success: true, message: 'Request reschedule berhasil ditolak', data: enrollment };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, 'Gagal menolak request reschedule'),
    };
  }
}
