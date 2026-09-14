import { EnrollmentTable } from '@/features/enrollments/components/enrollment-table';
import { DataLoadAlert } from '@/components/dashboard/data-load-alert';
import { emptyEnrollments, safelyLoad } from '@/lib/dashboard/safe-data';
import type { EnrollmentListFilter, EnrollmentQuery } from '@/lib/dashboard/types';
import { getClassEnrollments } from '@/features/enrollments/data';

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseEnrollmentFilter(value: string | undefined): EnrollmentListFilter {
  if (
    value === 'all' ||
    value === 'payment_review_manual' ||
    value === 'payment_review_gateway' ||
    value === 'paid_enrollments' ||
    value === 'need_schedule_assignment' ||
    value === 'reschedule_requested'
  ) {
    return value;
  }

  if (value === 'confirmed' || value === 'completed') {
    return 'paid_enrollments';
  }

  if (value === 'waiting_payment_confirmation') {
    return 'payment_review_manual';
  }

  return 'all';
}

function parseEnrollmentQuery(searchParams: Record<string, string | string[] | undefined>): EnrollmentQuery {
  return {
    search: getParam(searchParams, 'search') ?? '',
    filter: parseEnrollmentFilter(getParam(searchParams, 'filter')),
  };
}

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseEnrollmentQuery(await searchParams);
  const enrollmentsResult = await safelyLoad(getClassEnrollments, emptyEnrollments);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Class Enrollments</h1>
        <p className="text-muted-foreground">
          Kelola pembayaran, jadwal, dan permintaan perubahan jadwal untuk enrollment kelas.
        </p>
      </div>
      <DataLoadAlert message={enrollmentsResult.error} />
      <EnrollmentTable enrollments={enrollmentsResult.data} filters={filters} />
    </div>
  );
}
