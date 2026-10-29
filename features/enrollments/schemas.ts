import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@/features/enrollments/utils';

const requiredText = (message: string) => z.string().trim().min(1, message);

const isoDateTime = requiredText('Tanggal dan waktu wajib diisi')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Tanggal dan waktu tidak valid');

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const text = value.trim();
    return text ? text : undefined;
  },
  z.string().optional(),
);

const ScheduleSessionInputSchema = z
  .object({
    id: requiredText('ID sesi wajib diisi'),
    sessionNumber: z.coerce.number().int('Nomor sesi harus berupa angka bulat').min(1, 'Nomor sesi tidak valid'),
    title: requiredText('Judul sesi wajib diisi').max(120, 'Judul sesi maksimal 120 karakter'),
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    timezone: z.string().trim().default(DEFAULT_TIMEZONE),
    teacherId: optionalText,
    teacherName: requiredText('Nama teacher wajib diisi').max(120, 'Nama teacher maksimal 120 karakter'),
    locationType: z.enum(['online', 'offline'], 'Tipe lokasi tidak valid'),
    locationLabel: requiredText('Label lokasi wajib diisi').max(200, 'Label lokasi maksimal 200 karakter'),
    meetingUrl: z.string().trim().max(500, 'Meeting URL maksimal 500 karakter').default(''),
    status: z.literal('scheduled').default('scheduled'),
    notes: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').default(''),
  })
  .superRefine((session, ctx) => {
    const startsAt = new Date(session.startsAt).getTime();
    const endsAt = new Date(session.endsAt).getTime();

    if (endsAt <= startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'Jam selesai harus setelah jam mulai',
      });
    }

    if (session.locationType === 'online' && !session.meetingUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meetingUrl'],
        message: 'Meeting URL wajib diisi untuk kelas online',
      });
    }
  });

export const AssignEnrollmentScheduleSchema = z.object({
  enrollmentId: requiredText('Enrollment tidak valid'),
  sessions: z
    .array(ScheduleSessionInputSchema)
    .min(1, 'Minimal harus ada satu sesi'),
});

export const ApproveManualPaymentSchema = z.object({
  enrollmentId: requiredText('Enrollment tidak valid'),
});

export const RejectManualPaymentSchema = z.object({
  enrollmentId: requiredText('Enrollment tidak valid'),
  adminNote: requiredText('Catatan admin wajib diisi').max(1000, 'Catatan admin maksimal 1000 karakter'),
  nextEnrollmentStatus: z.enum(['cancelled', 'waiting_payment_confirmation']).default('cancelled'),
});

export const UpdateEnrollmentSessionStatusSchema = z.object({
  enrollmentId: requiredText('Enrollment tidak valid'),
  sessionId: requiredText('Sesi tidak valid'),
  status: z.enum(['scheduled', 'completed', 'cancelled'], 'Status sesi tidak valid'),
});

export const ApproveRescheduleRequestSchema = z
  .object({
    enrollmentId: requiredText('Enrollment tidak valid'),
    targetSessionId: requiredText('Sesi target tidak valid'),
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    timezone: z.string().trim().default(DEFAULT_TIMEZONE),
    teacherId: optionalText,
    teacherName: optionalText,
    locationType: z.enum(['online', 'offline']).optional(),
    locationLabel: optionalText,
    meetingUrl: optionalText,
    adminNote: requiredText('Catatan admin wajib diisi').max(1000, 'Catatan admin maksimal 1000 karakter'),
  })
  .superRefine((request, ctx) => {
    const startsAt = new Date(request.startsAt).getTime();
    const endsAt = new Date(request.endsAt).getTime();

    if (endsAt <= startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'Jam selesai harus setelah jam mulai',
      });
    }
  });

export const RejectRescheduleRequestSchema = z.object({
  enrollmentId: requiredText('Enrollment tidak valid'),
  adminNote: requiredText('Catatan admin wajib diisi').max(1000, 'Catatan admin maksimal 1000 karakter'),
});

export type AssignEnrollmentScheduleInput = z.infer<typeof AssignEnrollmentScheduleSchema>;
export type ApproveManualPaymentInput = z.infer<typeof ApproveManualPaymentSchema>;
export type RejectManualPaymentInput = z.infer<typeof RejectManualPaymentSchema>;
export type UpdateEnrollmentSessionStatusInput = z.infer<typeof UpdateEnrollmentSessionStatusSchema>;
export type ApproveRescheduleRequestInput = z.infer<typeof ApproveRescheduleRequestSchema>;
export type RejectRescheduleRequestInput = z.infer<typeof RejectRescheduleRequestSchema>;

