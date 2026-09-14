'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteClassAction } from '@/features/classes/actions';
import {
  ClassFlagBadges,
  ClassStatusBadge,
  ClassTypeBadge,
} from '@/features/classes/components/class-badges';
import { ClassDeleteDialog } from '@/features/classes/components/class-delete-dialog';
import { ClassImagePreview, ClassPriceDisplay } from '@/features/classes/components/class-display';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { CLASS_TYPE_OPTIONS } from '@/features/classes/constants';
import { Class, ClassQuery } from '@/lib/dashboard/types';
import { getClassTypeLabel } from '@/lib/dashboard/utils';

interface ClassTableProps {
  classes: Class[];
  filters: ClassQuery;
}

const CLASS_PAGE_SIZE = 10;

function cleanParamValue(key: string, value: string | undefined): string | null {
  const text = value?.trim() ?? '';

  if (!text || ((key === 'type' || key === 'status') && text === 'all')) {
    return null;
  }

  return text;
}

function getSearchText(classItem: Class): string {
  return [
    classItem.slug,
    classItem.name.id,
    classItem.name.en,
    classItem.name.zh,
    classItem.level,
  ].filter(Boolean).join(' ').toLowerCase();
}

function filterClasses(classes: Class[], filters: ClassQuery): Class[] {
  const query = filters.search?.trim().toLowerCase();

  return classes.filter((classItem) => {
    const matchesSearch = !query || getSearchText(classItem).includes(query);
    const matchesType = !filters.type || filters.type === 'all' || classItem.type === filters.type;
    const matchesStatus =
      !filters.status ||
      filters.status === 'all' ||
      (filters.status === 'active' ? classItem.isActive : !classItem.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });
}

export function ClassTable({ classes, filters }: ClassTableProps) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filteredClasses = useMemo(() => filterClasses(classes, filters), [classes, filters]);
  const totalPages = Math.max(Math.ceil(filteredClasses.length / CLASS_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleClasses = useMemo(() => {
    const start = (currentPage - 1) * CLASS_PAGE_SIZE;
    return filteredClasses.slice(start, start + CLASS_PAGE_SIZE);
  }, [currentPage, filteredClasses]);
  const firstItem = filteredClasses.length === 0 ? 0 : (currentPage - 1) * CLASS_PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * CLASS_PAGE_SIZE, filteredClasses.length);

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

  const updateQuery = (updates: ClassQuery) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('subject');
    const nextValues: Record<string, string | undefined> = {
      search: filters.search,
      type: filters.type,
      status: filters.status,
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

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }

    startTransition(async () => {
      const result = await deleteClassAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Daftar Kelas</CardTitle>
            <CardDescription>Kelola kelas bahasa, harga, jadwal sesi, dan status publikasi.</CardDescription>
          </div>
          <CardAction>
            <Button asChild>
              <Link href="/dashboard/classes/new">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kelas
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Cari nama kelas, slug, atau level"
              />
            </div>
            <Select value={filters.type ?? 'all'} onValueChange={(value) => updateQuery({ type: value as ClassQuery['type'] })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {CLASS_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status ?? 'all'} onValueChange={(value) => updateQuery({ status: value as ClassQuery['status'] })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPending ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Memproses perubahan data kelas...
            </div>
          ) : null}

          {filteredClasses.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="font-medium">Kelas tidak ditemukan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ubah kata kunci, filter, atau tambahkan kelas bahasa baru.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Kelas</TableHead>
                    <TableHead className="w-[120px]">Tipe</TableHead>
                    <TableHead className="w-[120px]">Level</TableHead>
                    <TableHead className="w-[160px]">Harga</TableHead>
                    <TableHead className="w-[152px]">Sesi</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                    <TableHead className="w-[132px]">Label</TableHead>
                    <TableHead className="w-[152px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleClasses.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <ClassImagePreview classItem={classItem} />
                          <div className="min-w-0">
                            <p className="truncate font-medium" title={classItem.name.id}>
                              {classItem.name.id}
                            </p>
                            <p className="truncate text-sm text-muted-foreground" title={classItem.name.en}>
                              {classItem.name.en}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ClassTypeBadge type={classItem.type} />
                      </TableCell>
                      <TableCell className="truncate" title={classItem.level}>
                        {classItem.level}
                      </TableCell>
                      <TableCell>
                        <ClassPriceDisplay classItem={classItem} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{classItem.totalSessions} sesi</p>
                          <p className="text-sm text-muted-foreground">{classItem.sessionDurationMinutes} menit</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ClassStatusBadge isActive={classItem.isActive} />
                      </TableCell>
                      <TableCell>
                        <ClassFlagBadges classItem={classItem} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" asChild aria-label="Lihat Detail">
                            <Link href={`/dashboard/classes/${classItem.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="icon" asChild aria-label="Edit">
                            <Link href={`/dashboard/classes/${classItem.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteTarget(classItem)}
                            disabled={isPending}
                            aria-label="Hapus Kelas"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Menampilkan {firstItem}-{lastItem} dari {filteredClasses.length} kelas.
              {filteredClasses.length !== classes.length ? ` Total data: ${classes.length}.` : ''}
              {filters.type && filters.type !== 'all' ? ` Tipe: ${getClassTypeLabel(filters.type)}.` : ''}
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

      <ClassDeleteDialog
        classItem={deleteTarget}
        isPending={isPending}
        onConfirm={handleDelete}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </>
  );
}
