'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface EventEnrollmentTableProps {
  enrollments: EventEnrollment[];
}

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

function getEventDisplayName(enrollment: EventEnrollment): string {
  return (
    enrollment.eventSnapshot.displayName ||
    enrollment.eventSnapshot.name.id ||
    enrollment.eventSnapshot.name.en ||
    enrollment.eventSlug ||
    '-'
  );
}

function getTrainerNames(enrollment: EventEnrollment): string {
  return enrollment.eventSnapshot.trainers.map((trainer) => trainer.name).join(', ') || '-';
}

function getSearchText(enrollment: EventEnrollment): string {
  return [
    getStudentDisplayName(enrollment),
    getStudentEmail(enrollment),
    getEventDisplayName(enrollment),
    enrollment.eventSlug,
    enrollment.eventSnapshot.slug,
    getTrainerNames(enrollment),
  ].filter(Boolean).join(' ').toLowerCase();
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
    return 'Gratis';
  }

  if (enrollment.payment.method === 'manual') {
    return enrollment.payment.status === 'paid' ? 'Transfer Manual (Lunas)' : 'Transfer Manual (Menunggu)';
  }

  const gatewayStatusMap: Record<string, string> = {
    paid: 'Otomatis (Lunas)',
    pending: 'Otomatis (Diproses)',
    failed: 'Otomatis (Gagal)',
    expired: 'Otomatis (Kedaluwarsa)',
  };

  return gatewayStatusMap[enrollment.payment.status] || `Otomatis (${enrollment.payment.status})`;
}

function getPaymentAmount(enrollment: EventEnrollment): string {
  return enrollment.payment.method === 'free' ? 'Gratis' : formatRupiah(enrollment.payment.amount);
}

function EventEnrollmentStatusBadge({ status }: { status: EventEnrollmentStatus }) {
  return (
    <Badge variant="outline" className={getBadgeClass(getStatusTone(status))}>
      {getStatusLabel(status)}
    </Badge>
  );
}

export function EventEnrollmentTable({ enrollments }: EventEnrollmentTableProps) {
  const [search, setSearch] = useState('');
  const filteredEnrollments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return enrollments;
    }

    return enrollments.filter((enrollment) => getSearchText(enrollment).includes(query));
  }, [enrollments, search]);

  useEffect(() => {
    setSearch('');
  }, [enrollments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Pendaftaran Event</CardTitle>
        <CardDescription>
          Pantau data peserta, status pembayaran tiket, dan jadwal pelaksanaan event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Cari nama peserta, email, judul event, atau pemateri"
          />
        </div>

        {filteredEnrollments.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="font-medium">Pendaftaran event tidak ditemukan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Belum ada data pendaftaran yang sesuai dengan pencarian ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[1080px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Peserta</TableHead>
                  <TableHead className="w-[260px]">Event</TableHead>
                  <TableHead className="w-[160px]">Pembayaran</TableHead>
                  <TableHead className="w-[150px]">Nominal</TableHead>
                  <TableHead className="w-[170px]">Mulai</TableHead>
                  <TableHead className="w-[190px]">Trainer</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments.map((enrollment) => (
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
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium" title={getEventDisplayName(enrollment)}>
                          {getEventDisplayName(enrollment)}
                        </p>
                        <p className="truncate text-sm text-muted-foreground" title={enrollment.eventSlug || enrollment.eventSnapshot.slug}>
                          {enrollment.eventSlug || enrollment.eventSnapshot.slug || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getPaymentLabel(enrollment)}</TableCell>
                    <TableCell>{getPaymentAmount(enrollment)}</TableCell>
                    <TableCell>{formatDashboardDate(enrollment.eventSnapshot.startsAt)}</TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-sm" title={getTrainerNames(enrollment)}>
                        {getTrainerNames(enrollment)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <EventEnrollmentStatusBadge status={enrollment.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredEnrollments.length} dari {enrollments.length} event enrollment.
        </p>
      </CardContent>
    </Card>
  );
}
