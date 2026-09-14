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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Monitor classes, events, students, enrollments, payments, schedules, and operational tasks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/events/new">
              <CalendarDays className="mr-2 h-4 w-4" />
              Add Event
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/classes/new">
              <GraduationCap className="mr-2 h-4 w-4" />
              Add Class
            </Link>
          </Button>
        </div>
      </div>

      <DataLoadAlert
        message={summaryResult.error
          ? `Unable to load dashboard data. ${summaryResult.error}`
          : null}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Students"
          value={summary.students.total}
          helper={`+${summary.students.newThisMonth} this month`}
          icon={<UsersRound className="h-4 w-4" />}
        />
        <MetricCard
          label="Active Classes"
          value={summary.classes.active}
          helper={`${summary.classes.total} total classes`}
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <MetricCard
          label="Active Events"
          value={summary.events.active}
          helper={`${summary.events.upcoming} upcoming events`}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <MetricCard
          label="Pending Class Enrollments"
          value={summary.enrollments.pending}
          helper={`${summary.enrollments.active} active class enrollments`}
          icon={<ClipboardClock className="h-4 w-4" />}
        />
        <MetricCard
          label="Pending Payments"
          value={summary.payments.pending}
          helper={`${summary.payments.pendingManualReview} proofs need review`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <MetricCard
          label="Revenue This Month"
          value={formatCurrencyIDR(summary.payments.revenueThisMonth)}
          helper={`${summary.payments.paidThisMonth} paid payments`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <MetricCard
          label="Today's Schedules"
          value={summary.schedules.today}
          helper={`${summary.schedules.upcomingThisWeek} upcoming this week`}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <MetricCard
          label="Pending Reschedules"
          value={summary.rescheduleRequests.pending}
          helper={`${summary.rescheduleRequests.approvedThisMonth} approved this month`}
          icon={<RefreshCw className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
