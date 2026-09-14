'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
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
import { Student, StudentQuery } from '@/lib/dashboard/types';

interface StudentTableProps {
  students: Student[];
  filters: StudentQuery;
}

const STUDENT_PAGE_SIZE = 10;

function cleanParamValue(key: string, value: string | undefined): string | null {
  const text = value?.trim() ?? '';

  if (!text) {
    return null;
  }

  return text;
}

function formatDateOnly(value: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date);
}

function formatAddress(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(', ');
}

function getKtpAddress(student: Student): string {
  return student.ktpAddress || formatAddress([
    student.ktpStreet,
    student.ktpVillageName,
    student.ktpDistrictName,
    student.ktpRegencyName,
    student.ktpProvinceName,
  ]);
}

function getDomicileAddress(student: Student): string {
  if (student.domicileSameAsKtp) {
    return getKtpAddress(student);
  }

  return student.domicileAddress || formatAddress([
    student.domicileStreet,
    student.domicileVillageName,
    student.domicileDistrictName,
    student.domicileRegencyName,
    student.domicileProvinceName,
  ]);
}

function getSearchText(student: Student): string {
  return [
    student.fullName,
    student.nickname,
    student.email,
    student.phoneCountryCode,
    student.phoneNationalNumber,
    student.phoneNumber,
    student.birthDate,
    student.birthPlace,
    student.ktpStreet,
    student.ktpProvinceName,
    student.ktpRegencyName,
    student.ktpDistrictName,
    student.ktpVillageName,
    student.ktpAddress,
    student.domicileStreet,
    student.domicileProvinceName,
    student.domicileRegencyName,
    student.domicileDistrictName,
    student.domicileVillageName,
    student.domicileAddress,
    student.lastEducation,
  ].filter(Boolean).join(' ').toLowerCase();
}

function filterStudents(students: Student[], filters: StudentQuery): Student[] {
  const query = filters.search?.trim().toLowerCase();

  return students.filter((student) => {
    return !query || getSearchText(student).includes(query);
  });
}

export function StudentTable({ students, filters }: StudentTableProps) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filteredStudents = useMemo(() => filterStudents(students, filters), [students, filters]);
  const totalPages = Math.max(Math.ceil(filteredStudents.length / STUDENT_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleStudents = useMemo(() => {
    const start = (currentPage - 1) * STUDENT_PAGE_SIZE;
    return filteredStudents.slice(start, start + STUDENT_PAGE_SIZE);
  }, [currentPage, filteredStudents]);
  const firstItem = filteredStudents.length === 0 ? 0 : (currentPage - 1) * STUDENT_PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * STUDENT_PAGE_SIZE, filteredStudents.length);

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
    // updateQuery intentionally uses current URL state from the latest render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters.search]);

  const updateQuery = (updates: StudentQuery) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    const nextValues: Record<string, string | undefined> = {
      search: filters.search,
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
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Daftar Siswa</CardTitle>
          <CardDescription>Data siswa berdasarkan profil yang tersimpan dari aplikasi pengguna.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Cari nama, email, telepon, alamat, atau pendidikan"
            />
          </div>
        </div>

        {isPending ? (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Memproses perubahan data siswa...
          </div>
        ) : null}

        {filteredStudents.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="font-medium">Siswa tidak ditemukan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ubah kata kunci untuk melihat data siswa lain.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Siswa</TableHead>
                  <TableHead className="w-[240px]">Email</TableHead>
                  <TableHead className="w-[150px]">Telepon</TableHead>
                  <TableHead className="w-[180px]">Tempat / Tanggal Lahir</TableHead>
                  <TableHead className="w-[180px]">Pendidikan Terakhir</TableHead>
                  <TableHead className="w-[260px]">Alamat KTP</TableHead>
                  <TableHead className="w-[260px]">Domisili</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium" title={student.fullName}>
                          {student.fullName || '-'}
                        </p>
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={student.nickname}
                        >
                          {student.nickname || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="truncate" title={student.email}>
                      {student.email || '-'}
                    </TableCell>
                    <TableCell className="truncate" title={student.phoneNumber}>
                      {student.phoneNumber || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate" title={student.birthPlace}>
                          {student.birthPlace || '-'}
                        </p>
                        <p className="truncate text-sm text-muted-foreground" title={student.birthDate}>
                          {formatDateOnly(student.birthDate)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="truncate" title={student.lastEducation}>
                      {student.lastEducation || '-'}
                    </TableCell>
                    <TableCell className="truncate" title={getKtpAddress(student)}>
                      {getKtpAddress(student) || '-'}
                    </TableCell>
                    <TableCell className="truncate" title={getDomicileAddress(student)}>
                      {getDomicileAddress(student) || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Menampilkan {firstItem}-{lastItem} dari {filteredStudents.length} siswa.
            {filteredStudents.length !== students.length ? ` Total data: ${students.length}.` : ''}
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
