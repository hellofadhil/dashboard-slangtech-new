'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteTeacherAction } from '@/features/teachers/actions';
import { TeacherCreateDialog } from '@/features/teachers/components/teacher-create-dialog';
import type { Teacher, TeacherQuery } from '@/features/teachers/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TeacherTableProps {
  teachers: Teacher[];
  filters: TeacherQuery;
}

const TEACHER_PAGE_SIZE = 10;

function cleanParamValue(value: string | undefined): string | null {
  const text = value?.trim() ?? '';
  return text ? text : null;
}

function formatAddress(teacher: Teacher): string {
  if (teacher.address.fullAddress) {
    return teacher.address.fullAddress;
  }

  return [
    teacher.address.street,
    teacher.address.villageName,
    teacher.address.districtName,
    teacher.address.regencyName,
    teacher.address.provinceName,
  ].filter(Boolean).join(', ');
}

function getSearchText(teacher: Teacher): string {
  return [
    teacher.fullName,
    teacher.nickname,
    teacher.email,
    teacher.phoneNumber,
    teacher.lastEducation,
    formatAddress(teacher),
  ].filter(Boolean).join(' ').toLowerCase();
}

function filterTeachers(teachers: Teacher[], filters: TeacherQuery): Teacher[] {
  const query = filters.search?.trim().toLowerCase();
  return teachers.filter((teacher) => !query || getSearchText(teacher).includes(query));
}

function getTeacherName(teacher: Teacher | null): string {
  if (!teacher) {
    return '';
  }

  return teacher.fullName || teacher.email || 'guru ini';
}

export function TeacherTable({ teachers, filters }: TeacherTableProps) {
  const [items, setItems] = useState(teachers);
  const [search, setSearch] = useState(filters.search ?? '');
  const [page, setPage] = useState(1);
  const [detailTarget, setDetailTarget] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filteredTeachers = useMemo(() => filterTeachers(items, filters), [items, filters]);
  const totalPages = Math.max(Math.ceil(filteredTeachers.length / TEACHER_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleTeachers = useMemo(() => {
    const start = (currentPage - 1) * TEACHER_PAGE_SIZE;
    return filteredTeachers.slice(start, start + TEACHER_PAGE_SIZE);
  }, [currentPage, filteredTeachers]);
  const firstItem = filteredTeachers.length === 0 ? 0 : (currentPage - 1) * TEACHER_PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * TEACHER_PAGE_SIZE, filteredTeachers.length);

  useEffect(() => {
    setItems(teachers);
  }, [teachers]);

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

  const updateQuery = (updates: TeacherQuery) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    const nextValues: Record<string, string | undefined> = {
      search: filters.search,
      ...updates,
    };

    Object.entries(nextValues).forEach(([key, value]) => {
      const cleaned = cleanParamValue(value);
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

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTeacherAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setItems((current) => current.filter((teacher) => teacher.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daftar Guru</CardTitle>
            <CardDescription>Kelola akun guru dan lihat data profil guru yang terdaftar.</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Guru
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Cari nama, email, telepon, pendidikan, atau alamat"
            />
          </div>

          {isPending ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Memproses perubahan data guru...
            </div>
          ) : null}

          {filteredTeachers.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="font-medium">Guru tidak ditemukan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ubah kata kunci untuk melihat data guru lain.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nama & Username</TableHead>
                    <TableHead className="w-[220px]">Email</TableHead>
                    <TableHead className="w-[140px]">Nomor Telepon</TableHead>
                    <TableHead className="w-[150px]">Pendidikan</TableHead>
                    <TableHead className="w-[130px]">Status Profil</TableHead>
                    <TableHead className="w-[240px]">Alamat</TableHead>
                    <TableHead className="w-[100px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTeachers.map((teacher) => {
                    const address = formatAddress(teacher);
                    const displayName = teacher.fullName || teacher.nickname || teacher.username || teacher.email;
                    const usernameTag = teacher.nickname || teacher.username;

                    return (
                      <TableRow key={teacher.id}>
                        <TableCell className="truncate font-medium" title={displayName}>
                          <div className="flex flex-col">
                            <span className="truncate">{displayName || '-'}</span>
                            {teacher.fullName && usernameTag ? (
                              <span className="text-xs text-muted-foreground">@{usernameTag}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="truncate text-muted-foreground" title={teacher.email}>
                          {teacher.email || '-'}
                        </TableCell>
                        <TableCell className="truncate" title={teacher.phoneNumber}>
                          {teacher.phoneNumber || '-'}
                        </TableCell>
                        <TableCell className="truncate" title={teacher.lastEducation}>
                          {teacher.lastEducation || '-'}
                        </TableCell>
                        <TableCell>
                          {teacher.isProfileComplete ? (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Lengkap
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                              Belum Lengkap
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="truncate" title={address}>
                          {address || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setDetailTarget(teacher)}
                              disabled={isPending}
                              aria-label={`Lihat detail guru ${teacher.email}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setDeleteTarget(teacher)}
                              disabled={isPending}
                              aria-label={`Hapus guru ${teacher.email}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Menampilkan {firstItem}-{lastItem} dari {filteredTeachers.length} guru.
              {filteredTeachers.length !== items.length ? ` Total data: ${items.length}.` : ''}
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

      <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Guru</DialogTitle>
            <DialogDescription>
              Informasi akun dan data profil lengkap guru.
            </DialogDescription>
          </DialogHeader>

          {detailTarget ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Nama Lengkap" value={detailTarget.fullName || '(Belum diisi)'} />
                <ReadOnlyField label="Username / Nickname" value={detailTarget.nickname || detailTarget.username || '-'} />
                <ReadOnlyField label="Email Akun" value={detailTarget.email} />
                <ReadOnlyField label="Nomor Telepon" value={detailTarget.phoneNumber || '(Belum diisi)'} />
                <ReadOnlyField
                  label="Status Profil"
                  value={detailTarget.isProfileComplete ? 'Lengkap' : 'Belum Lengkap'}
                />
                <ReadOnlyField label="Pendidikan Terakhir" value={detailTarget.lastEducation || '(Belum diisi)'} />
                <ReadOnlyField label="Tempat Lahir" value={detailTarget.birthPlace || '-'} />
                <ReadOnlyField label="Tanggal Lahir" value={detailTarget.birthDate || '-'} />
                <ReadOnlyField label="Pengalaman Mengajar" value={`${detailTarget.experienceYears || 0} Tahun`} />
                <ReadOnlyField label="Headline" value={detailTarget.headline || '-'} />
                <ReadOnlyField label="Status Akun" value={detailTarget.status === 'active' ? 'Aktif' : 'Tidak Aktif'} />
                <ReadOnlyField label="Dibuat Oleh" value={detailTarget.createdBy || 'Admin'} />
              </div>

              {detailTarget.bio ? (
                <ReadOnlyArea label="Bio" value={detailTarget.bio} rows={3} />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <ReadOnlyArea label="Alamat Lengkap" value={formatAddress(detailTarget) || '(Belum diisi)'} rows={3} />
                </div>
                <ReadOnlyField label="Jalan" value={detailTarget.address.street || '-'} />
                <ReadOnlyField label="Provinsi" value={detailTarget.address.provinceName || '-'} />
                <ReadOnlyField label="Kota / Kabupaten" value={detailTarget.address.regencyName || '-'} />
                <ReadOnlyField label="Kecamatan" value={detailTarget.address.districtName || '-'} />
                <ReadOnlyField label="Kelurahan / Desa" value={detailTarget.address.villageName || '-'} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailTarget(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <TeacherCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Guru?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun guru untuk {getTeacherName(deleteTarget)} akan dihapus dari sistem dan tidak dapat login kembali. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus Akun Guru'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="min-h-9 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        {value || '-'}
      </div>
    </div>
  );
}

function ReadOnlyArea({ label, value, rows }: { label: string; value: string; rows: number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap"
        style={{ minHeight: `${rows * 1.75 + 1}rem` }}
      >
        {value || '-'}
      </div>
    </div>
  );
}
