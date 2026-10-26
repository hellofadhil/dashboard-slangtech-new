'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye, Search } from 'lucide-react';
import {
  EnrollmentStatusBadge,
  PaymentStatusBadge,
  RescheduleRequestStatusBadge,
  ScheduleStatusBadge,
} from '@/features/enrollments/components/enrollment-badges';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getClassDisplayName,
  getEnrollmentSearchText,
  getStudentDisplayName,
  getStudentEmail,
  matchesEnrollmentFilter,
} from '@/features/enrollments/utils';
import type {
  ClassEnrollment,
  EnrollmentListFilter,
  EnrollmentQuery,
} from '@/lib/dashboard/types';
import { formatDashboardDate, formatRupiah } from '@/lib/dashboard/utils';

interface EnrollmentTableProps {
  enrollments: ClassEnrollment[];
  filters: EnrollmentQuery;
}

type PrimaryWorkflowTab = 'all' | 'payment_review' | 'paid_enrollments' | 'need_schedule_assignment' | 'reschedule_requested';

const ENROLLMENT_PAGE_SIZE = 10;

const PRIMARY_WORKFLOW_TABS: Array<{
  value: PrimaryWorkflowTab;
  label: string;
  filter: EnrollmentListFilter;
}> = [
  { value: 'all', label: 'Semua', filter: 'all' },
  { value: 'payment_review', label: 'Menunggu Pembayaran', filter: 'payment_review_manual' },
  { value: 'paid_enrollments', label: 'Pembayaran Berhasil', filter: 'paid_enrollments' },
  { value: 'need_schedule_assignment', label: 'Atur Jadwal', filter: 'need_schedule_assignment' },
  { value: 'reschedule_requested', label: 'Permintaan Jadwal', filter: 'reschedule_requested' },
];

const PAYMENT_REVIEW_FILTERS: Array<{
  value: EnrollmentListFilter;
  label: string;
}> = [
  { value: 'payment_review_manual', label: 'Transfer Manual' },
  { value: 'payment_review_gateway', label: 'Pembayaran Otomatis' },
];

function cleanParamValue(key: string, value: string | undefined): string | null {
  const text = value?.trim() ?? '';

  if (!text || (key === 'filter' && text === 'all')) {
    return null;
  }

  return text;
}

function getPrimaryWorkflowTab(filter: EnrollmentListFilter): PrimaryWorkflowTab {
  if (filter === 'all') {
    return 'all';
  }

  if (filter === 'paid_enrollments' || filter === 'confirmed' || filter === 'completed') {
    return 'paid_enrollments';
  }

  if (filter === 'need_schedule_assignment') {
    return 'need_schedule_assignment';
  }

  if (filter === 'reschedule_requested') {
    return 'reschedule_requested';
  }

  return 'payment_review';
}

function getWorkflowCopy(filter: EnrollmentListFilter): { title: string; description: string; empty: string } {
  if (filter === 'all') {
    return {
      title: 'Semua Pendaftaran Kelas',
      description: 'Seluruh riwayat pendaftaran kelas siswa, baik yang sudah lunas, selesai, dibatalkan, maupun menunggu verifikasi.',
      empty: 'Belum ada data pendaftaran kelas.',
    };
  }

  if (filter === 'payment_review_gateway') {
    return {
      title: 'Pembayaran Otomatis',
      description: 'Pantau transaksi otomatis yang sedang diproses, berhasil, gagal, atau kedaluwarsa.',
      empty: 'Tidak ada transaksi otomatis yang perlu dipantau.',
    };
  }

  if (filter === 'paid_enrollments') {
    return {
      title: 'Pembayaran Berhasil',
      description: 'Daftar siswa yang pembayarannya telah terverifikasi dan status pendaftarannya aktif.',
      empty: 'Belum ada pendaftaran dengan pembayaran berhasil.',
    };
  }

  if (filter === 'need_schedule_assignment') {
    return {
      title: 'Atur Jadwal',
      description: 'Daftar siswa yang sudah lunas namun belum ditentukan jadwal belajarnya.',
      empty: 'Tidak ada siswa yang menunggu penjadwalan.',
    };
  }

  if (filter === 'reschedule_requested') {
    return {
      title: 'Permintaan Ganti Jadwal',
      description: 'Permohonan perubahan jadwal sesi belajar dari siswa yang perlu ditinjau admin.',
      empty: 'Tidak ada permohonan perubahan jadwal saat ini.',
    };
  }

  return {
    title: 'Transfer Manual',
    description: 'Bukti transfer pembayaran yang diunggah siswa dan menunggu verifikasi admin.',
    empty: 'Tidak ada bukti transfer yang perlu diverifikasi.',
  };
}

function filterEnrollments(enrollments: ClassEnrollment[], filters: EnrollmentQuery): ClassEnrollment[] {
  const query = filters.search?.trim().toLowerCase();
  const filter = filters.filter ?? 'payment_review_manual';

  return enrollments.filter((enrollment) => {
    const matchesSearch = !query || getEnrollmentSearchText(enrollment).includes(query);
    return matchesSearch && matchesEnrollmentFilter(enrollment, filter);
  });
}

function countByFilter(enrollments: ClassEnrollment[], filter: EnrollmentListFilter): number {
  return enrollments.filter((enrollment) => matchesEnrollmentFilter(enrollment, filter)).length;
}

function getPaymentMethodLabel(enrollment: ClassEnrollment): string {
  return enrollment.payment.method === 'manual' ? 'Transfer Manual' : 'Pembayaran Otomatis';
}

function getPaymentDate(enrollment: ClassEnrollment): string {
  if (enrollment.payment.reviewedAt) {
    return formatDashboardDate(enrollment.payment.reviewedAt);
  }

  if (enrollment.payment.method === 'manual') {
    return formatDashboardDate(enrollment.payment.manual.uploadedAt);
  }

  return formatDashboardDate(enrollment.updatedAt);
}

function getGatewayStatusLabel(enrollment: ClassEnrollment): string {
  if (enrollment.payment.status === 'paid') {
    return 'Pembayaran lunas';
  }

  if (enrollment.payment.status === 'failed') {
    return 'Pembayaran gagal';
  }

  if (enrollment.payment.status === 'expired') {
    return 'Pembayaran kedaluwarsa';
  }

  return 'Sedang diproses';
}

function getPendingRequest(enrollment: ClassEnrollment) {
  const request = enrollment.schedule?.rescheduleRequest;
  return request?.status === 'pending_admin_approval' ? request : null;
}

function getRequestTargetSession(enrollment: ClassEnrollment) {
  const request = getPendingRequest(enrollment);
  return enrollment.schedule?.sessions.find((session) => session.id === request?.targetSessionId) ?? null;
}

function getDetailHref(enrollment: ClassEnrollment, filter: EnrollmentListFilter): string {
  const detailTab = filter === 'all'
    ? 'overview'
    : filter === 'need_schedule_assignment'
    ? 'schedule'
    : filter === 'reschedule_requested'
      ? 'requests'
      : filter === 'paid_enrollments'
        ? 'overview'
        : 'payment';

  return `/dashboard/enrollments/${enrollment.id}?tab=${detailTab}`;
}

function getActionLabel(enrollment: ClassEnrollment, filter: EnrollmentListFilter): string {
  if (filter === 'all') {
    return 'Detail';
  }

  if (filter === 'need_schedule_assignment') {
    return 'Buat Jadwal';
  }

  if (filter === 'reschedule_requested') {
    return 'Review';
  }

  if (filter === 'paid_enrollments') {
    return matchesEnrollmentFilter(enrollment, 'need_schedule_assignment') ? 'Atur Jadwal' : 'Detail';
  }

  return filter === 'payment_review_gateway' ? 'Lihat Detail' : 'Review';
}

function EnrollmentIdentity({ enrollment }: { enrollment: ClassEnrollment }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium" title={getStudentDisplayName(enrollment)}>
        {getStudentDisplayName(enrollment)}
      </p>
      <p className="truncate text-sm text-muted-foreground" title={getStudentEmail(enrollment)}>
        {getStudentEmail(enrollment)}
      </p>
    </div>
  );
}

function ClassIdentity({ enrollment }: { enrollment: ClassEnrollment }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium" title={getClassDisplayName(enrollment)}>
        {getClassDisplayName(enrollment)}
      </p>
      <p className="truncate text-sm text-muted-foreground" title={enrollment.classSlug || enrollment.classSnapshot.slug}>
        {enrollment.classSlug || enrollment.classSnapshot.slug || '-'}
      </p>
    </div>
  );
}

function RowAction({ enrollment, filter }: { enrollment: ClassEnrollment; filter: EnrollmentListFilter }) {
  return (
    <div className="flex justify-end">
      <Button variant="outline" size="sm" asChild>
        <Link href={getDetailHref(enrollment, filter)}>
          <Eye className="mr-2 h-4 w-4" />
          {getActionLabel(enrollment, filter)}
        </Link>
      </Button>
    </div>
  );
}

function WorkflowTable({ enrollments, filter }: { enrollments: ClassEnrollment[]; filter: EnrollmentListFilter }) {
  if (filter === 'all') {
    return (
      <Table className="min-w-[1100px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Siswa</TableHead>
            <TableHead className="w-[250px]">Kelas</TableHead>
            <TableHead className="w-[160px]">Enrollment</TableHead>
            <TableHead className="w-[150px]">Pembayaran</TableHead>
            <TableHead className="w-[140px]">Nominal</TableHead>
            <TableHead className="w-[170px]">Jadwal</TableHead>
            <TableHead className="w-[160px]">Dibuat</TableHead>
            <TableHead className="w-[120px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell><EnrollmentIdentity enrollment={enrollment} /></TableCell>
              <TableCell><ClassIdentity enrollment={enrollment} /></TableCell>
              <TableCell><EnrollmentStatusBadge status={enrollment.status} /></TableCell>
              <TableCell><PaymentStatusBadge status={enrollment.payment.status} /></TableCell>
              <TableCell>{formatRupiah(enrollment.payment.amount)}</TableCell>
              <TableCell><ScheduleStatusBadge status={enrollment.schedule?.status} /></TableCell>
              <TableCell>{formatDashboardDate(enrollment.createdAt)}</TableCell>
              <TableCell><RowAction enrollment={enrollment} filter={filter} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (filter === 'payment_review_gateway') {
    return (
      <Table className="min-w-[980px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Siswa</TableHead>
            <TableHead className="w-[240px]">Kelas</TableHead>
            <TableHead className="w-[140px]">Nominal</TableHead>
            <TableHead className="w-[210px]">Status</TableHead>
            <TableHead className="w-[170px]">Provider</TableHead>
            <TableHead className="w-[170px]">Expired</TableHead>
            <TableHead className="w-[130px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell><EnrollmentIdentity enrollment={enrollment} /></TableCell>
              <TableCell><ClassIdentity enrollment={enrollment} /></TableCell>
              <TableCell>{formatRupiah(enrollment.payment.amount)}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <PaymentStatusBadge status={enrollment.payment.status} />
                  <p className="text-sm text-muted-foreground">{getGatewayStatusLabel(enrollment)}</p>
                </div>
              </TableCell>
              <TableCell>{enrollment.payment.method === 'payment_gateway' ? enrollment.payment.gateway.provider || '-' : '-'}</TableCell>
              <TableCell>{enrollment.payment.method === 'payment_gateway' ? formatDashboardDate(enrollment.payment.gateway.expiresAt) : '-'}</TableCell>
              <TableCell><RowAction enrollment={enrollment} filter={filter} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (filter === 'paid_enrollments') {
    return (
      <Table className="min-w-[1060px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Siswa</TableHead>
            <TableHead className="w-[240px]">Kelas</TableHead>
            <TableHead className="w-[170px]">Metode</TableHead>
            <TableHead className="w-[140px]">Nominal</TableHead>
            <TableHead className="w-[170px]">Tanggal Bayar</TableHead>
            <TableHead className="w-[170px]">Jadwal</TableHead>
            <TableHead className="w-[130px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell><EnrollmentIdentity enrollment={enrollment} /></TableCell>
              <TableCell><ClassIdentity enrollment={enrollment} /></TableCell>
              <TableCell>{getPaymentMethodLabel(enrollment)}</TableCell>
              <TableCell>{formatRupiah(enrollment.payment.amount)}</TableCell>
              <TableCell>{getPaymentDate(enrollment)}</TableCell>
              <TableCell><ScheduleStatusBadge status={enrollment.schedule?.status} /></TableCell>
              <TableCell><RowAction enrollment={enrollment} filter={filter} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (filter === 'need_schedule_assignment') {
    return (
      <Table className="min-w-[920px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Siswa</TableHead>
            <TableHead className="w-[260px]">Kelas</TableHead>
            <TableHead className="w-[130px]">Total Sesi</TableHead>
            <TableHead className="w-[130px]">Durasi</TableHead>
            <TableHead className="w-[170px]">Tanggal Bayar</TableHead>
            <TableHead className="w-[130px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell><EnrollmentIdentity enrollment={enrollment} /></TableCell>
              <TableCell><ClassIdentity enrollment={enrollment} /></TableCell>
              <TableCell>{enrollment.classSnapshot.totalSessions} sesi</TableCell>
              <TableCell>{enrollment.classSnapshot.sessionDurationMinutes} menit</TableCell>
              <TableCell>{getPaymentDate(enrollment)}</TableCell>
              <TableCell><RowAction enrollment={enrollment} filter={filter} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (filter === 'reschedule_requested') {
    return (
      <Table className="min-w-[1120px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Siswa</TableHead>
            <TableHead className="w-[230px]">Kelas</TableHead>
            <TableHead className="w-[130px]">Sesi</TableHead>
            <TableHead className="w-[190px]">Jadwal Saat Ini</TableHead>
            <TableHead className="w-[250px]">Alasan</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[120px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => {
            const request = getPendingRequest(enrollment);
            const targetSession = getRequestTargetSession(enrollment);

            return (
              <TableRow key={enrollment.id}>
                <TableCell><EnrollmentIdentity enrollment={enrollment} /></TableCell>
                <TableCell><ClassIdentity enrollment={enrollment} /></TableCell>
                <TableCell>{targetSession ? `Sesi ${targetSession.sessionNumber}` : request?.targetSessionId || '-'}</TableCell>
                <TableCell>{targetSession ? formatDashboardDate(targetSession.startsAt) : '-'}</TableCell>
                <TableCell>
                  <p className="line-clamp-2 text-sm" title={request?.reason || '-'}>
                    {request?.reason || '-'}
                  </p>
                </TableCell>
                <TableCell>{request ? <RescheduleRequestStatusBadge status={request.status} /> : '-'}</TableCell>
                <TableCell><RowAction enrollment={enrollment} filter={filter} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table className="min-w-[940px] table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[220px]">Siswa</TableHead>
          <TableHead className="w-[260px]">Kelas</TableHead>
          <TableHead className="w-[150px]">Nominal</TableHead>
          <TableHead className="w-[170px]">Upload Bukti</TableHead>
          <TableHead className="w-[150px]">Status</TableHead>
          <TableHead className="w-[130px] text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments.map((enrollment) => (
          <TableRow key={enrollment.id}>
            <TableCell><EnrollmentIdentity enrollment={enrollment} /></TableCell>
            <TableCell><ClassIdentity enrollment={enrollment} /></TableCell>
            <TableCell>{formatRupiah(enrollment.payment.amount)}</TableCell>
            <TableCell>{enrollment.payment.method === 'manual' ? formatDashboardDate(enrollment.payment.manual.uploadedAt) : '-'}</TableCell>
            <TableCell><PaymentStatusBadge status={enrollment.payment.status} /></TableCell>
            <TableCell><RowAction enrollment={enrollment} filter={filter} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function EnrollmentTable({ enrollments, filters }: EnrollmentTableProps) {
  const activeFilter = filters.filter ?? 'payment_review_manual';
  const [search, setSearch] = useState(filters.search ?? '');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filteredEnrollments = useMemo(() => filterEnrollments(enrollments, filters), [enrollments, filters]);
  const totalPages = Math.max(Math.ceil(filteredEnrollments.length / ENROLLMENT_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleEnrollments = useMemo(() => {
    const start = (currentPage - 1) * ENROLLMENT_PAGE_SIZE;
    return filteredEnrollments.slice(start, start + ENROLLMENT_PAGE_SIZE);
  }, [currentPage, filteredEnrollments]);
  const firstItem = filteredEnrollments.length === 0 ? 0 : (currentPage - 1) * ENROLLMENT_PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * ENROLLMENT_PAGE_SIZE, filteredEnrollments.length);
  const primaryWorkflowTab = getPrimaryWorkflowTab(activeFilter);
  const workflowCopy = getWorkflowCopy(activeFilter);

  useEffect(() => {
    setSearch(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== (filters.search ?? '')) {
        updateQuery({ search });
      }
    }, 350);

    return () => window.clearTimeout(timer);
    // updateQuery intentionally uses the latest URL state from render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters.search]);

  const updateQuery = (updates: EnrollmentQuery) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    const nextValues: Record<string, string | undefined> = {
      search: filters.search,
      filter: activeFilter,
      ...updates,
    };

    Object.entries(nextValues).forEach(([key, value]) => {
      const cleaned = cleanParamValue(key, value);
      if (cleaned === null) {
        params.delete(key);
      } else {
        params.set(key, cleaned);
      }
    });

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{workflowCopy.title}</CardTitle>
        <CardDescription>{workflowCopy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Tabs
            value={primaryWorkflowTab}
            onValueChange={(value) => {
              const nextTab = PRIMARY_WORKFLOW_TABS.find((tab) => tab.value === value);
              if (nextTab) {
                updateQuery({ filter: nextTab.filter });
              }
            }}
          >
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg p-1 sm:w-fit">
              {PRIMARY_WORKFLOW_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 px-3 py-2" disabled={isPending}>
                  {tab.label}
                  <span className="ml-1 rounded bg-background/80 px-1.5 py-0.5 text-xs">
                    {tab.value === 'all'
                      ? countByFilter(enrollments, 'all')
                      : tab.value === 'payment_review'
                      ? countByFilter(enrollments, 'payment_review_manual') + countByFilter(enrollments, 'payment_review_gateway')
                      : countByFilter(enrollments, tab.filter)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {primaryWorkflowTab === 'payment_review' ? (
            <Tabs value={activeFilter} onValueChange={(value) => updateQuery({ filter: value as EnrollmentListFilter })}>
              <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg p-1 sm:w-fit">
                {PAYMENT_REVIEW_FILTERS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value} className="shrink-0 px-3 py-2" disabled={isPending}>
                    {option.label}
                    <span className="ml-1 rounded bg-background/80 px-1.5 py-0.5 text-xs">
                      {countByFilter(enrollments, option.value)}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Cari nama siswa, email, nama kelas, atau slug"
            />
          </div>
        </div>

        {isPending ? (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Memproses perubahan filter enrollment...
          </div>
        ) : null}

        {filteredEnrollments.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="font-medium">{workflowCopy.empty}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ubah kata kunci atau buka tab lain untuk melihat enrollment berbeda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <WorkflowTable enrollments={visibleEnrollments} filter={activeFilter} />
          </div>
        )}

        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Menampilkan {firstItem}-{lastItem} dari {filteredEnrollments.length} enrollment.
            {filteredEnrollments.length !== enrollments.length ? ` Total data: ${enrollments.length}.` : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
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
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage >= totalPages || isPending}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
