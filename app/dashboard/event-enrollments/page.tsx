import { EventEnrollmentTable } from '@/features/event-enrollments/components/event-enrollment-table';
import { DataLoadAlert } from '@/components/dashboard/data-load-alert';
import { emptyEventEnrollments, safelyLoad } from '@/lib/dashboard/safe-data';
import { getEventEnrollments } from '@/features/event-enrollments/data';

export default async function EventEnrollmentsPage() {
  const enrollmentsResult = await safelyLoad(getEventEnrollments, emptyEventEnrollments);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Event Enrollments</h1>
        <p className="text-muted-foreground">
          Kelola enrollment event secara terpisah dari class enrollments.
        </p>
      </div>
      <DataLoadAlert message={enrollmentsResult.error} />
      <EventEnrollmentTable enrollments={enrollmentsResult.data} />
    </div>
  );
}
