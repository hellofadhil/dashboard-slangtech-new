import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ClassTypeBadge } from '@/features/classes/components/class-badges';
import {
  EnrollmentStatusBadge,
  PaymentStatusBadge,
  ScheduleStatusBadge,
} from '@/features/enrollments/components/enrollment-badges';
import { PaymentReviewPanel } from '@/features/enrollments/components/payment-review-panel';
import { RescheduleRequestPanel } from '@/features/enrollments/components/reschedule-request-panel';
import { SchedulePanel } from '@/features/enrollments/components/schedule-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getClassDisplayName,
  getStudentDisplayName,
  getStudentEmail,
} from '@/features/enrollments/utils';
import type { ClassEnrollment } from '@/lib/dashboard/types';
import { formatDashboardDate, formatRupiah } from '@/lib/dashboard/utils';
import { getClassEnrollmentById } from '@/features/enrollments/data';

type EnrollmentDetailTab = 'overview' | 'payment' | 'schedule' | 'requests' | 'activity';

interface EnrollmentDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseDetailTab(value: string | undefined): EnrollmentDetailTab {
  if (
    value === 'overview' ||
    value === 'payment' ||
    value === 'schedule' ||
    value === 'requests' ||
    value === 'activity'
  ) {
    return value;
  }

  return 'overview';
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function getNextAction(enrollment: ClassEnrollment): string {
  const payment = enrollment.payment;
  const request = enrollment.schedule?.rescheduleRequest;

  if (payment.method === 'manual' && payment.status === 'waiting_confirmation') {
    return 'Verifikasi bukti transfer';
  }

  if (payment.method === 'payment_gateway' && payment.status !== 'paid') {
    return 'Pantau pembayaran otomatis';
  }

  if (
    payment.status === 'paid' &&
    enrollment.status === 'confirmed' &&
    (!enrollment.schedule || enrollment.schedule.status === 'pending_admin_assignment')
  ) {
    return 'Atur jadwal belajar';
  }

  if (request?.status === 'pending_admin_approval') {
    return 'Tinjau permintaan jadwal';
  }

  if (enrollment.schedule?.status === 'assigned') {
    return 'Pantau progres sesi';
  }

  if (enrollment.status === 'completed' || enrollment.schedule?.status === 'completed') {
    return 'Pendaftaran selesai';
  }

  return 'Periksa status pendaftaran';
}

function getPaymentMethodLabel(enrollment: ClassEnrollment): string {
  return enrollment.payment.method === 'manual' ? 'Transfer Manual' : 'Pembayaran Otomatis';
}

function getActivityItems(enrollment: ClassEnrollment): Array<{
  key: string;
  at: string;
  title: string;
  description: string;
}> {
  const items: Array<{
    key: string;
    at: string;
    title: string;
    description: string;
  }> = [
    {
      key: 'created',
      at: enrollment.createdAt,
      title: 'Pendaftaran dibuat',
      description: `${getStudentDisplayName(enrollment)} mendaftar ke ${getClassDisplayName(enrollment)}.`,
    },
  ];

  if (enrollment.payment.method === 'manual' && enrollment.payment.manual.uploadedAt) {
    items.push({
      key: 'proof-uploaded',
      at: enrollment.payment.manual.uploadedAt,
      title: 'Bukti transfer diunggah',
      description: enrollment.payment.manual.proofFileName || 'Siswa mengunggah bukti pembayaran.',
    });
  }

  if (enrollment.payment.reviewedAt) {
    items.push({
      key: 'payment-reviewed',
      at: enrollment.payment.reviewedAt,
      title: enrollment.payment.status === 'paid' ? 'Pembayaran disetujui' : 'Pembayaran diverifikasi',
      description: enrollment.payment.reviewedBy
        ? `Diverifikasi oleh ${enrollment.payment.reviewedBy}.`
        : 'Status pembayaran diperbarui oleh admin.',
    });
  }

  if (enrollment.schedule?.assignedAt) {
    items.push({
      key: 'schedule-assigned',
      at: enrollment.schedule.assignedAt,
      title: 'Jadwal dibuat',
      description: `${enrollment.schedule.sessions.length} sesi belajar disimpan untuk pendaftaran ini.`,
    });
  }

  const request = enrollment.schedule?.rescheduleRequest;
  if (request?.requestedAt) {
    items.push({
      key: 'reschedule-requested',
      at: request.requestedAt,
      title: 'Permintaan jadwal masuk',
      description: request.reason || 'Siswa mengirim permintaan perubahan jadwal.',
    });
  }

  if (request?.reviewedAt) {
    items.push({
      key: 'reschedule-reviewed',
      at: request.reviewedAt,
      title: request.status === 'approved' ? 'Permintaan jadwal disetujui' : 'Permintaan jadwal ditinjau',
      description: request.adminNote || 'Admin memperbarui status permintaan jadwal.',
    });
  }

  return items.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}

export default async function EnrollmentDetailPage({ params, searchParams }: EnrollmentDetailPageProps) {
  const { id } = await params;
  const parsedSearchParams = await searchParams;
  const activeTab = parseDetailTab(getParam(parsedSearchParams, 'tab'));
  const enrollment = await getClassEnrollmentById(id);

  if (!enrollment) {
    notFound();
  }

  const student = enrollment.studentSnapshot;
  const classSnapshot = enrollment.classSnapshot;
  const activities = getActivityItems(enrollment);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{getStudentDisplayName(enrollment)}</h1>
          <p className="mt-2 text-muted-foreground">
            {getClassDisplayName(enrollment)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <EnrollmentStatusBadge status={enrollment.status} />
            <PaymentStatusBadge status={enrollment.payment.status} />
            <ScheduleStatusBadge status={enrollment.schedule?.status} />
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/enrollments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Enrollments
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={activeTab} className="gap-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg p-1 sm:w-fit">
          <TabsTrigger value="overview" className="shrink-0 px-3 py-2">Overview</TabsTrigger>
          <TabsTrigger value="payment" className="shrink-0 px-3 py-2">Payment</TabsTrigger>
          <TabsTrigger value="schedule" className="shrink-0 px-3 py-2">Schedule</TabsTrigger>
          <TabsTrigger value="requests" className="shrink-0 px-3 py-2">Requests</TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0 px-3 py-2">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Student" value={getStudentDisplayName(enrollment)} />
              <InfoItem label="Email" value={getStudentEmail(enrollment)} />
              <InfoItem label="Phone" value={student.phoneNumber || '-'} />
              <InfoItem label="Next Action" value={getNextAction(enrollment)} />
              <InfoItem label="Class" value={getClassDisplayName(enrollment)} />
              <InfoItem label="Type" value={<ClassTypeBadge type={classSnapshot.type} />} />
              <InfoItem label="Level" value={classSnapshot.level || '-'} />
              <InfoItem label="Payment Method" value={getPaymentMethodLabel(enrollment)} />
              <InfoItem label="Amount" value={formatRupiah(enrollment.payment.amount)} />
              <InfoItem label="Total Sessions" value={`${classSnapshot.totalSessions} sesi`} />
              <InfoItem label="Duration" value={`${classSnapshot.sessionDurationMinutes} menit`} />
              <div className="sm:col-span-2 lg:col-span-4">
                <InfoItem
                  label="Reason for Joining"
                  value={<p className="whitespace-pre-line font-normal">{enrollment.reason || '-'}</p>}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <PaymentReviewPanel enrollment={enrollment} />
        </TabsContent>

        <TabsContent value="schedule">
          <SchedulePanel enrollment={enrollment} />
        </TabsContent>

        <TabsContent value="requests">
          <RescheduleRequestPanel enrollment={enrollment} />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Belum ada activity yang bisa ditampilkan.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.key} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{formatDashboardDate(activity.at)}</p>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
