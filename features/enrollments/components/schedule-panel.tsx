'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateEnrollmentSessionStatusAction } from '@/features/enrollments/actions';
import { AssignScheduleForm } from '@/features/enrollments/components/assign-schedule-form';
import {
  ScheduleStatusBadge,
  SessionStatusBadge,
} from '@/features/enrollments/components/enrollment-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ClassEnrollment, ScheduleSessionStatus } from '@/lib/dashboard/types';
import type { Teacher } from '@/features/teachers/types';
import { formatDashboardDate } from '@/lib/dashboard/utils';

interface SchedulePanelProps {
  enrollment: ClassEnrollment;
  teachers?: Teacher[];
}

const SCHEDULE_PAGE_SIZE = 6;

function canAssignSchedule(enrollment: ClassEnrollment): boolean {
  return enrollment.payment.status === 'paid' &&
    enrollment.status === 'confirmed' &&
    (!enrollment.schedule || enrollment.schedule.status === 'pending_admin_assignment');
}

export function SchedulePanel({ enrollment, teachers = [] }: SchedulePanelProps) {
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const schedule = enrollment.schedule;
  const showAssignForm = canAssignSchedule(enrollment);
  const totalSessions = schedule?.sessions.length ?? 0;
  const totalPages = Math.max(Math.ceil(totalSessions / SCHEDULE_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleSessions = useMemo(() => {
    const start = (currentPage - 1) * SCHEDULE_PAGE_SIZE;
    return schedule?.sessions.slice(start, start + SCHEDULE_PAGE_SIZE) ?? [];
  }, [currentPage, schedule?.sessions]);
  const firstItem = totalSessions === 0 ? 0 : (currentPage - 1) * SCHEDULE_PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * SCHEDULE_PAGE_SIZE, totalSessions);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSessionStatusChange = (sessionId: string, status: ScheduleSessionStatus) => {
    if (status === 'rescheduled') {
      return;
    }

    startTransition(async () => {
      const result = await updateEnrollmentSessionStatusAction({
        enrollmentId: enrollment.id,
        sessionId,
        status,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>Jadwal</CardTitle>
          <CardDescription>Atur jadwal kelas dan pantau status setiap sesi.</CardDescription>
        </div>
        <ScheduleStatusBadge status={schedule?.status} />
      </CardHeader>
      <CardContent className="space-y-6">
        {showAssignForm ? (
          <AssignScheduleForm enrollment={enrollment} teachers={teachers} />
        ) : null}

        {!showAssignForm && (!schedule || schedule.status === 'pending_admin_assignment') ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Jadwal dapat diatur setelah pembayaran berhasil dan enrollment terkonfirmasi.
          </div>
        ) : null}

        {schedule && schedule.sessions.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="mt-1 font-medium">{schedule.timezone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diatur Pada</p>
                <p className="mt-1 font-medium">{formatDashboardDate(schedule.assignedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
                <p className="mt-1 font-medium">{formatDashboardDate(schedule.startDate)}</p>
              </div>
            </div>

            {isPending ? (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Memperbarui status sesi...
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[1120px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Sesi</TableHead>
                    <TableHead className="w-[190px]">Mulai</TableHead>
                    <TableHead className="w-[190px]">Selesai</TableHead>
                    <TableHead className="w-[160px]">Teacher</TableHead>
                    <TableHead className="w-[130px]">Lokasi</TableHead>
                    <TableHead className="w-[220px]">Meeting / Catatan</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[170px]">Ubah Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{session.title}</p>
                          <p className="text-sm text-muted-foreground">#{session.sessionNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDashboardDate(session.startsAt)}</TableCell>
                      <TableCell>{formatDashboardDate(session.endsAt)}</TableCell>
                      <TableCell className="truncate" title={session.teacherName}>
                        <div className="flex items-center gap-1.5">
                          {session.teacherId ? (
                            <span
                              className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0"
                              title="Terhubung ke Data Guru"
                            />
                          ) : null}
                          <span className="truncate">{session.teacherName || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="capitalize">{session.locationType}</p>
                          <p className="truncate text-sm text-muted-foreground" title={session.locationLabel}>
                            {session.locationLabel || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          {session.meetingUrl ? (
                            <a className="block truncate text-link hover:underline" href={session.meetingUrl} target="_blank" rel="noreferrer">
                              {session.meetingUrl}
                            </a>
                          ) : (
                            <p className="text-muted-foreground">-</p>
                          )}
                          <p className="truncate text-sm text-muted-foreground" title={session.notes}>
                            {session.notes || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SessionStatusBadge status={session.status} />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={session.status}
                          onValueChange={(value) => handleSessionStatusChange(session.id, value as ScheduleSessionStatus)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Terjadwal</SelectItem>
                            <SelectItem value="completed">Selesai</SelectItem>
                            <SelectItem value="cancelled">Dibatalkan</SelectItem>
                            <SelectItem value="rescheduled" disabled>Dijadwal Ulang</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalSessions > SCHEDULE_PAGE_SIZE ? (
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Menampilkan sesi {firstItem}-{lastItem} dari {totalSessions}.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage <= 1 || isPending}
                  >
                    Sebelumnya
                  </Button>
                  <span className="min-w-24 text-center">
                    Hal {currentPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage >= totalPages || isPending}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {schedule && schedule.sessions.length === 0 && !showAssignForm ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Belum ada sesi yang tersimpan pada schedule ini.
          </div>
        ) : null}

        {showAssignForm && schedule && schedule.sessions.length > 0 ? (
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            Refresh Jadwal
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
