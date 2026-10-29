import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Banknote,
  CalendarClock,
  CalendarDays,
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
import { cn } from '@/lib/utils';

function getIndonesianDate(): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

interface MetricCardProps {
  label: string;
  value: ReactNode;
  helper: string;
  icon: ReactNode;
  iconBgColor?: string;
  badge?: ReactNode;
  valueClassName?: string;
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  iconBgColor = 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground',
  badge,
  valueClassName,
}: MetricCardProps) {
  return (
    <Card className="border-border/80 transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconBgColor)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div
          className={cn(
            'truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl',
            valueClassName,
          )}
          title={typeof value === 'string' ? value : undefined}
        >
          {value}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
          <span>{helper}</span>
          {badge}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const summaryResult = await safelyLoad(getDashboardSummary, emptyDashboardSummary);
  const summary = summaryResult.data;

  const todayDateString = getIndonesianDate();

  return (
    <div className="space-y-8">
      {/* Page Header with Live Context */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>{todayDateString}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ringkasan
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Pantau aktivitas program kelas, event, siswa, pendaftaran, pembayaran, dan jadwal belajar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" asChild className="gap-2 shadow-xs">
            <Link href="/dashboard/events/new">
              <CalendarDays className="h-4 w-4" />
              <span>Tambah Event</span>
            </Link>
          </Button>
          <Button size="sm" asChild className="gap-2 shadow-xs">
            <Link href="/dashboard/classes/new">
              <GraduationCap className="h-4 w-4" />
              <span>Tambah Kelas</span>
            </Link>
          </Button>
        </div>
      </div>

      <DataLoadAlert
        message={
          summaryResult.error
            ? `Gagal memuat ringkasan data dashboard: ${summaryResult.error}`
            : null
        }
      />

      {/* 8 Primary Operational Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Total Siswa */}
        <MetricCard
          label="Total Siswa"
          value={summary.students.total}
          helper={`+${summary.students.newThisMonth} siswa baru bulan ini`}
          icon={<UsersRound className="h-4 w-4" />}
          iconBgColor="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
        />

        {/* 2. Kelas Aktif */}
        <MetricCard
          label="Kelas Aktif"
          value={summary.classes.active}
          helper={`${summary.classes.total} total kelas`}
          icon={<GraduationCap className="h-4 w-4" />}
          iconBgColor="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        />

        {/* 3. Event Aktif */}
        <MetricCard
          label="Event Aktif"
          value={summary.events.active}
          helper={`${summary.events.upcoming} event mendatang`}
          icon={<CalendarDays className="h-4 w-4" />}
          iconBgColor="bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
        />

        {/* 4. Pendaftaran Menunggu */}
        <MetricCard
          label="Pendaftaran Menunggu"
          value={summary.enrollments.pending}
          helper={`${summary.enrollments.active} pendaftaran aktif`}
          icon={<ClipboardClock className="h-4 w-4" />}
          iconBgColor="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
        />

        {/* 5. Verifikasi Pembayaran */}
        <MetricCard
          label="Verifikasi Pembayaran"
          value={summary.payments.pending}
          helper={`${summary.payments.pendingManualReview} bukti transfer perlu dicek`}
          icon={<Banknote className="h-4 w-4" />}
          iconBgColor="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
        />

        {/* 6. Pendapatan Bulan Ini */}
        <MetricCard
          label="Pendapatan Bulan Ini"
          value={formatCurrencyIDR(summary.payments.revenueThisMonth)}
          helper={`${summary.payments.paidThisMonth} transaksi lunas`}
          icon={<Banknote className="h-4 w-4" />}
          iconBgColor="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
          valueClassName="text-xl sm:text-2xl xl:text-xl"
        />

        {/* 7. Jadwal Hari Ini */}
        <MetricCard
          label="Jadwal Hari Ini"
          value={summary.schedules.today}
          helper={`${summary.schedules.upcomingThisWeek} jadwal minggu ini`}
          icon={<CalendarClock className="h-4 w-4" />}
          iconBgColor="bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
        />

        {/* 8. Permintaan Ganti Jadwal */}
        <MetricCard
          label="Permintaan Ganti Jadwal"
          value={summary.rescheduleRequests.pending}
          helper={`${summary.rescheduleRequests.approvedThisMonth} disetujui bulan ini`}
          icon={<RefreshCw className="h-4 w-4" />}
          iconBgColor="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
        />
      </div>
    </div>
  );
}
