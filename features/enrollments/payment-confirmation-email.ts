import 'server-only';

import type { ClassEnrollment } from '@/lib/dashboard/types';
import { sendSmtpMail } from '@/lib/email/smtp';
import { formatDashboardDate, formatRupiah } from '@/features/shared/utils';
import {
  getClassDisplayName,
  getStudentDisplayName,
  getStudentEmail,
} from '@/features/enrollments/utils';

type PaymentConfirmationEmailContent = {
  to: string;
  fullName: string;
  className: string;
  classPrice: string;
  confirmedAt: string;
  dashboardUrl: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getOptionalStudentDashboardUrl(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_STUDENT_APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return null;
  }

  try {
    return new URL('/home', appUrl).toString();
  } catch {
    return null;
  }
}

function createPaymentConfirmationEmail(input: PaymentConfirmationEmailContent) {
  const safeFullName = escapeHtml(input.fullName);
  const safeClassName = escapeHtml(input.className);
  const safeClassPrice = escapeHtml(input.classPrice);
  const safeConfirmedAt = escapeHtml(input.confirmedAt);
  const safeDashboardUrl = input.dashboardUrl ? escapeHtml(input.dashboardUrl) : null;

  return {
    subject: `Pembayaran Kelas ${input.className} Berhasil Dikonfirmasi`,
    text: [
      `Halo ${input.fullName},`,
      '',
      `Pembayaran kamu untuk kelas ${input.className} sudah berhasil dikonfirmasi oleh admin.`,
      `Nominal: ${input.classPrice}`,
      `Dikonfirmasi pada: ${input.confirmedAt}`,
      '',
      'Enrollment kamu sudah aktif. Tim LKP SlangTech akan melanjutkan proses penjadwalan kelas.',
      input.dashboardUrl
        ? `Kamu bisa memantau status enrollment melalui dashboard: ${input.dashboardUrl}`
        : 'Informasi jadwal akan dikabarkan oleh tim LKP SlangTech.',
      '',
      'Terima kasih,',
      'LKP SlangTech',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
        <h1 style="margin:0 0 12px;color:#087A35;font-size:24px">Pembayaran Berhasil Dikonfirmasi</h1>
        <p>Halo <strong>${safeFullName}</strong>,</p>
        <p>Pembayaran kamu untuk kelas <strong>${safeClassName}</strong> sudah berhasil dikonfirmasi oleh admin.</p>
        <div style="margin:20px 0;padding:16px;border:1px solid #E5E7EB;border-radius:8px;background:#F9FAFB">
          <p style="margin:0 0 8px"><strong>Nominal:</strong> ${safeClassPrice}</p>
          <p style="margin:0"><strong>Dikonfirmasi pada:</strong> ${safeConfirmedAt}</p>
        </div>
        <p>Enrollment kamu sudah aktif. Tim LKP SlangTech akan melanjutkan proses penjadwalan kelas.</p>
        ${
          safeDashboardUrl
            ? `
              <p>Kamu bisa memantau status enrollment melalui dashboard.</p>
              <p>
                <a href="${safeDashboardUrl}" style="display:inline-block;background:#087A35;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">
                  Buka Dashboard
                </a>
              </p>
            `
            : '<p>Informasi jadwal akan dikabarkan oleh tim LKP SlangTech.</p>'
        }
        <p style="margin-top:24px;color:#6B7280">Terima kasih,<br />LKP SlangTech</p>
      </div>
    `,
  };
}

export async function sendPaymentConfirmationEmail(enrollment: ClassEnrollment): Promise<void> {
  const to = getStudentEmail(enrollment).trim();

  if (!to || to === '-' || !to.includes('@')) {
    throw new Error('Email siswa belum tersedia untuk mengirim konfirmasi pembayaran.');
  }

  const email = createPaymentConfirmationEmail({
    to,
    fullName: getStudentDisplayName(enrollment),
    className: getClassDisplayName(enrollment),
    classPrice: formatRupiah(enrollment.payment.amount),
    confirmedAt: formatDashboardDate(enrollment.payment.reviewedAt),
    dashboardUrl: getOptionalStudentDashboardUrl(),
  });

  await sendSmtpMail({
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}
