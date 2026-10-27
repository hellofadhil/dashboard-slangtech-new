import 'server-only';

import type { ClassEnrollment } from '@/lib/dashboard/types';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';
import {
  getClassDisplayName,
  getStudentDisplayName,
} from '@/features/enrollments/utils';

export function getStudentPhone(enrollment: ClassEnrollment): string {
  const snapshot = enrollment.studentSnapshot;
  if (!snapshot) {
    return '';
  }

  if (snapshot.phoneNumber && snapshot.phoneNumber.trim()) {
    return snapshot.phoneNumber.trim();
  }

  const code = (snapshot.phoneCountryCode || '').trim();
  const national = (snapshot.phoneNationalNumber || '').trim();
  if (national) {
    return `${code}${national}`;
  }

  return '';
}

export async function sendPaymentConfirmationWhatsApp(enrollment: ClassEnrollment): Promise<void> {
  const phone = getStudentPhone(enrollment);
  if (!phone) {
    throw new Error('Nomor telepon siswa belum tersedia untuk mengirim notifikasi WhatsApp.');
  }

  const studentName = getStudentDisplayName(enrollment);
  const className = getClassDisplayName(enrollment);

  const message = [
    `Halo ${studentName},`,
    '',
    `Pembayaran kamu untuk kelas ${className} telah diverifikasi oleh admin.`,
    'Pendaftaran kamu kini sudah aktif. Jadwal belajar akan segera ditetapkan oleh tim LKP SlangTech.',
    '',
    'Kamu bisa memantau jadwal dan link kelas melalui portal akunmu di SlangTech.',
    '',
    'Terima kasih telah bergabung bersama LKP SlangTech.',
  ].join('\n');

  await sendWhatsAppMessage(
    {
      phone,
      message,
    },
    'admin-payment-approval',
  );
}
