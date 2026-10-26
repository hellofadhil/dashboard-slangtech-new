import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Banknote,
  CalendarDays,
  CalendarClock,
  ClipboardClock,
  GraduationCap,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import { DataLoadAlert } from '@/components/dashboard/data-load-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardSummary } from '@/features/dashboard-summary/data';
import { safelyLoad } from '@/lib/dashboard/safe-data';
import { emptyDashboardSummary } from '@/lib/dashboard/types';
import { formatCurrencyIDR } from '@/lib/date';

function MetricCard({
  helper,
  icon,
  label,
  value,
}: {
  helper: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="truncate text-2xl font-bold" title={typeof value === 'string' ? value : undefined}>
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const summaryResult = await safelyLoad(getDashboardSummary, emptyDashboardSummary);
  const summary = summaryResult.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ringkasan</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Pantau aktivitas program kelas, event, siswa, pendaftaran, pembayaran, dan jadwal belajar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/events/new">
              <CalendarDays className="mr-2 h-4 w-4" />
              Tambah Event
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/classes/new">
              <GraduationCap className="mr-2 h-4 w-4" />
              Tambah Kelas
            </Link>
          </Button>
        </div>
      </div>

      <DataLoadAlert
        message={summaryResult.error
          ? `Gagal memuat ringkasan data dashboard. ${summaryResult.error}`
          : null}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Siswa"
          value={summary.students.total}
          helper={`+${summary.students.newThisMonth} siswa baru bulan ini`}
          icon={<UsersRound className="h-4 w-4" />}
        />
        <MetricCard
          label="Kelas Aktif"
          value={summary.classes.active}
          helper={`${summary.classes.total} total kelas`}
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <MetricCard
          label="Event Aktif"
          value={summary.events.active}
          helper={`${summary.events.upcoming} event mendatang`}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <MetricCard
          label="Pendaftaran Menunggu"
          value={summary.enrollments.pending}
          helper={`${summary.enrollments.active} pendaftaran aktif`}
          icon={<ClipboardClock className="h-4 w-4" />}
        />
        <MetricCard
          label="Verifikasi Pembayaran"
          value={summary.payments.pending}
          helper={`${summary.payments.pendingManualReview} bukti transfer perlu dicek`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <MetricCard
          label="Pendapatan Bulan Ini"
          value={formatCurrencyIDR(summary.payments.revenueThisMonth)}
          helper={`${summary.payments.paidThisMonth} transaksi lunas`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <MetricCard
          label="Jadwal Hari Ini"
          value={summary.schedules.today}
          helper={`${summary.schedules.upcomingThisWeek} jadwal minggu ini`}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <MetricCard
          label="Permintaan Ganti Jadwal"
          value={summary.rescheduleRequests.pending}
          helper={`${summary.rescheduleRequests.approvedThisMonth} disetujui bulan ini`}
          icon={<RefreshCw className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
