'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EventEnrollment, EventEnrollmentStatus } from '@/lib/dashboard/types';
import { formatDashboardDate, formatRupiah, getBadgeClass } from '@/lib/dashboard/utils';

interface EventParticipantsTableProps {
  enrollments: EventEnrollment[];
}

const PARTICIPANT_PAGE_SIZE = 10;

function getStudentDisplayName(enrollment: EventEnrollment): string {
  return (
    enrollment.studentSnapshot.fullName ||
    enrollment.studentSnapshot.displayName ||
    enrollment.studentSnapshot.email ||
    enrollment.uid ||
    '-'
  );
}

function getStudentEmail(enrollment: EventEnrollment): string {
  return enrollment.studentSnapshot.email || '-';
}

function getStatusLabel(status: EventEnrollmentStatus): string {
  const labels: Record<EventEnrollmentStatus, string> = {
    registered: 'Terdaftar',
    waiting_payment_confirmation: 'Menunggu Pembayaran',
    confirmed: 'Terkonfirmasi',
    cancelled: 'Dibatalkan',
    completed: 'Selesai',
  };

  return labels[status];
}

function getStatusTone(status: EventEnrollmentStatus): 'green' | 'red' | 'orange' | 'blue' | 'gray' {
  const tones: Record<EventEnrollmentStatus, 'green' | 'red' | 'orange' | 'blue' | 'gray'> = {
    registered: 'blue',
    waiting_payment_confirmation: 'orange',
    confirmed: 'green',
    cancelled: 'red',
    completed: 'gray',
  };

  return tones[status];
}

function getPaymentLabel(enrollment: EventEnrollment): string {
  if (enrollment.payment.method === 'free') {
    return 'Free';
  }

  if (enrollment.payment.method === 'manual') {
    return enrollment.payment.status === 'paid' ? 'Manual - paid' : 'Manual - menunggu';
  }

  return `Gateway - ${enrollment.payment.status}`;
}

function getPaymentAmount(enrollment: EventEnrollment): string {
  return enrollment.payment.method === 'free' ? 'Free' : formatRupiah(enrollment.payment.amount);
}

function getEnrollmentTime(enrollment: EventEnrollment): number {
  const time = new Date(enrollment.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function EventParticipantStatusBadge({ status }: { status: EventEnrollmentStatus }) {
  return (
    <Badge variant="outline" className={getBadgeClass(getStatusTone(status))}>
      {getStatusLabel(status)}
    </Badge>
  );
}

export function EventParticipantsTable({ enrollments }: EventParticipantsTableProps) {
  const [page, setPage] = useState(1);
  const sortedEnrollments = useMemo(
    () => [...enrollments].sort((a, b) => getEnrollmentTime(b) - getEnrollmentTime(a)),
    [enrollments],
  );
  const totalPages = Math.max(Math.ceil(sortedEnrollments.length / PARTICIPANT_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleEnrollments = useMemo(() => {
    const start = (currentPage - 1) * PARTICIPANT_PAGE_SIZE;
    return sortedEnrollments.slice(start, start + PARTICIPANT_PAGE_SIZE);
  }, [currentPage, sortedEnrollments]);
  const firstItem = sortedEnrollments.length === 0 ? 0 : (currentPage - 1) * PARTICIPANT_PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PARTICIPANT_PAGE_SIZE, sortedEnrollments.length);

  if (sortedEnrollments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="font-medium">Belum ada peserta terdaftar</p>
        <p className="mt-1 text-sm text-muted-foreground">Data peserta akan tampil setelah ada enrollment event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[900px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[240px]">Peserta</TableHead>
              <TableHead className="w-[160px]">Pembayaran</TableHead>
              <TableHead className="w-[150px]">Nominal</TableHead>
              <TableHead className="w-[170px]">Tanggal Daftar</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEnrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={getStudentDisplayName(enrollment)}>
                      {getStudentDisplayName(enrollment)}
                    </p>
                    <p className="truncate text-sm text-muted-foreground" title={getStudentEmail(enrollment)}>
                      {getStudentEmail(enrollment)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{getPaymentLabel(enrollment)}</TableCell>
                <TableCell>{getPaymentAmount(enrollment)}</TableCell>
                <TableCell>{formatDashboardDate(enrollment.createdAt)}</TableCell>
                <TableCell>
                  <EventParticipantStatusBadge status={enrollment.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Menampilkan {firstItem}-{lastItem} dari {sortedEnrollments.length} peserta.</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
          >
            Sebelumnya
          </Button>
          <span className="min-w-24 text-center">
            Hal {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
