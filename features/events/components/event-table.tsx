'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteEventAction } from '@/features/events/actions';
import {
  EventPriceTypeBadge,
  EventStatusBadge,
} from '@/features/events/components/event-badges';
import { EventDeleteDialog } from '@/features/events/components/event-delete-dialog';
import { EventImagePreview, EventPriceDisplay } from '@/features/events/components/event-display';
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
import { Event, EventQuery } from '@/lib/dashboard/types';
import { formatDashboardDate, getEventPriceTypeLabel, getEventTrainerNames } from '@/lib/dashboard/utils';

interface EventTableProps {
  events: Event[];
  filters: EventQuery;
}

const EVENT_PAGE_SIZE = 10;

function cleanParamValue(key: string, value: string | undefined): string | null {
  const text = value?.trim() ?? '';

  if (!text || ((key === 'priceType' || key === 'status') && text === 'all')) {
    return null;
  }

  return text;
}

function getSearchText(eventItem: Event): string {
  return [
    eventItem.slug,
    eventItem.name.id,
    eventItem.name.en,
    eventItem.name.zh,
    getEventTrainerNames(eventItem),
    eventItem.contact.name,
    eventItem.contact.whatsappNumber,
  ].filter(Boolean).join(' ').toLowerCase();
}

function filterEvents(events: Event[], filters: EventQuery): Event[] {
  const query = filters.search?.trim().toLowerCase();

  return events.filter((eventItem) => {
    const matchesSearch = !query || getSearchText(eventItem).includes(query);
    const matchesPriceType = !filters.priceType || filters.priceType === 'all' || eventItem.priceType === filters.priceType;
    const matchesStatus =
      !filters.status ||
      filters.status === 'all' ||
      (filters.status === 'active' ? eventItem.isActive : !eventItem.isActive);

    return matchesSearch && matchesPriceType && matchesStatus;
  });
}

export function EventTable({ events, filters }: EventTableProps) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filteredEvents = useMemo(() => filterEvents(events, filters), [events, filters]);
  const totalPages = Math.max(Math.ceil(filteredEvents.length / EVENT_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const visibleEvents = useMemo(() => {
    const start = (currentPage - 1) * EVENT_PAGE_SIZE;
    return filteredEvents.slice(start, start + EVENT_PAGE_SIZE);
  }, [currentPage, filteredEvents]);
  const firstItem = filteredEvents.length === 0 ? 0 : (currentPage - 1) * EVENT_PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * EVENT_PAGE_SIZE, filteredEvents.length);

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

  const updateQuery = (updates: EventQuery) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    const nextValues: Record<string, string | undefined> = {
      search: filters.search,
      priceType: filters.priceType,
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
      const result = await deleteEventAction(deleteTarget.id);
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
            <CardTitle>Daftar Event</CardTitle>
            <CardDescription>Kelola event, trainer, sesi, narahubung, harga, dan status publikasi.</CardDescription>
          </div>
          <CardAction>
            <Button asChild>
              <Link href="/dashboard/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Event
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Cari nama event, slug, trainer, atau narahubung"
              />
            </div>
            <Select value={filters.priceType ?? 'all'} onValueChange={(value) => updateQuery({ priceType: value as EventQuery['priceType'] })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua harga" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Harga</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Berbayar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status ?? 'all'} onValueChange={(value) => updateQuery({ status: value as EventQuery['status'] })}>
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
              Memproses perubahan data event...
            </div>
          ) : null}

          {filteredEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="font-medium">Event tidak ditemukan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ubah kata kunci, filter, atau tambahkan event baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[1120px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Event</TableHead>
                    <TableHead className="w-[140px]">Harga</TableHead>
                    <TableHead className="w-[120px]">Tipe</TableHead>
                    <TableHead className="w-[120px]">Sesi</TableHead>
                    <TableHead className="w-[170px]">Mulai</TableHead>
                    <TableHead className="w-[210px]">Trainer</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                    <TableHead className="w-[260px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEvents.map((eventItem) => (
                    <TableRow key={eventItem.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <EventImagePreview eventItem={eventItem} />
                          <div className="min-w-0">
                            <p className="truncate font-medium" title={eventItem.name.id}>
                              {eventItem.name.id}
                            </p>
                            <p className="truncate text-sm text-muted-foreground" title={eventItem.name.en}>
                              {eventItem.name.en}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <EventPriceDisplay eventItem={eventItem} />
                      </TableCell>
                      <TableCell>
                        <EventPriceTypeBadge priceType={eventItem.priceType} />
                      </TableCell>
                      <TableCell>{eventItem.sessions.length} sesi</TableCell>
                      <TableCell>{formatDashboardDate(eventItem.startsAt)}</TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm" title={getEventTrainerNames(eventItem)}>
                          {getEventTrainerNames(eventItem)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <EventStatusBadge isActive={eventItem.isActive} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/events/${eventItem.id}?tab=participants`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Peserta
                            </Link>
                          </Button>
                          <Button variant="outline" size="icon" asChild aria-label="Edit">
                            <Link href={`/dashboard/events/${eventItem.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteTarget(eventItem)}
                            disabled={isPending}
                            aria-label="Hapus Event"
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
              Menampilkan {firstItem}-{lastItem} dari {filteredEvents.length} event.
              {filteredEvents.length !== events.length ? ` Total data: ${events.length}.` : ''}
              {filters.priceType && filters.priceType !== 'all' ? ` Harga: ${getEventPriceTypeLabel(filters.priceType)}.` : ''}
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

      <EventDeleteDialog
        eventItem={deleteTarget}
        isPending={isPending}
        onConfirm={handleDelete}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </>
  );
}
