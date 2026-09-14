'use client';

import { type ReactNode, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveRescheduleRequestAction,
  rejectRescheduleRequestAction,
} from '@/features/enrollments/actions';
import {
  RescheduleRequestStatusBadge,
  SessionStatusBadge,
} from '@/features/enrollments/components/enrollment-badges';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_TIMEZONE } from '@/features/enrollments/utils';
import type {
  ClassEnrollment,
  EnrollmentScheduleSession,
  ScheduleLocationType,
} from '@/lib/dashboard/types';
import { formatDashboardDate } from '@/lib/dashboard/utils';

interface RescheduleRequestPanelProps {
  enrollment: ClassEnrollment;
}

function getJakartaParts(iso: string): { date: string; time: string } {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return {
      date: '',
      time: '',
    };
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    date: `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`,
    time: `${byType.get('hour')}:${byType.get('minute')}`,
  };
}

function normalizeTimeInput(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function createJakartaIso(date: string, time: string): string {
  if (!date || !time) {
    return '';
  }

  const parsedDate = new Date(`${date}T${normalizeTimeInput(time)}+07:00`);
  return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
}

function getFallbackEnd(startsAt: string, targetSession?: EnrollmentScheduleSession): string {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return '';
  }

  const targetStart = targetSession ? new Date(targetSession.startsAt) : null;
  const targetEnd = targetSession ? new Date(targetSession.endsAt) : null;
  const durationMs = targetStart && targetEnd && !Number.isNaN(targetStart.getTime()) && !Number.isNaN(targetEnd.getTime())
    ? Math.max(targetEnd.getTime() - targetStart.getTime(), 60 * 60 * 1000)
    : 60 * 60 * 1000;

  return new Date(start.getTime() + durationMs).toISOString();
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

export function RescheduleRequestPanel({ enrollment }: RescheduleRequestPanelProps) {
  const request = enrollment.schedule?.rescheduleRequest ?? null;
  const targetSession = useMemo(() => (
    enrollment.schedule?.sessions.find((session) => session.id === request?.targetSessionId)
  ), [enrollment.schedule?.sessions, request?.targetSessionId]);
  const firstPreferredSlot = request?.preferredSlots[0] ?? null;
  const defaultStart = firstPreferredSlot?.startsAt || targetSession?.startsAt || new Date().toISOString();
  const defaultEnd = firstPreferredSlot?.endsAt || getFallbackEnd(defaultStart, targetSession);
  const defaultStartParts = getJakartaParts(defaultStart);
  const defaultEndParts = getJakartaParts(defaultEnd);
  const [selectedSlot, setSelectedSlot] = useState(firstPreferredSlot ? '0' : 'custom');
  const [startDate, setStartDate] = useState(defaultStartParts.date);
  const [startTime, setStartTime] = useState(defaultStartParts.time);
  const [endDate, setEndDate] = useState(defaultEndParts.date);
  const [endTime, setEndTime] = useState(defaultEndParts.time);
  const [teacherName, setTeacherName] = useState(targetSession?.teacherName ?? '');
  const [locationType, setLocationType] = useState<ScheduleLocationType>(targetSession?.locationType ?? 'online');
  const [locationLabel, setLocationLabel] = useState(targetSession?.locationLabel ?? '');
  const [meetingUrl, setMeetingUrl] = useState(targetSession?.meetingUrl ?? '');
  const [adminNote, setAdminNote] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handlePreferredSlotChange = (value: string) => {
    setSelectedSlot(value);

    if (value === 'custom' || !request) {
      return;
    }

    const slot = request.preferredSlots[Number(value)];
    if (!slot) {
      return;
    }

    const slotStartParts = getJakartaParts(slot.startsAt);
    const slotEndParts = getJakartaParts(slot.endsAt || getFallbackEnd(slot.startsAt, targetSession));
    setStartDate(slotStartParts.date);
    setStartTime(slotStartParts.time);
    setEndDate(slotEndParts.date);
    setEndTime(slotEndParts.time);
  };

  const requestConfirmation = (action: 'approve' | 'reject') => {
    if (!request || request.status !== 'pending_admin_approval') {
      return;
    }

    if (!adminNote.trim()) {
      toast.error('Catatan admin wajib diisi');
      return;
    }

    if (action === 'approve') {
      const startsAt = createJakartaIso(startDate, startTime);
      const endsAt = createJakartaIso(endDate, endTime);
      const startsAtMs = new Date(startsAt).getTime();
      const endsAtMs = new Date(endsAt).getTime();

      if (Number.isNaN(startsAtMs) || Number.isNaN(endsAtMs)) {
        toast.error('Tanggal dan waktu approval belum valid');
        return;
      }

      if (endsAtMs <= startsAtMs) {
        toast.error('Jam selesai harus setelah jam mulai');
        return;
      }
    }

    setConfirmAction(action);
  };

  const handleConfirm = () => {
    if (!request || !confirmAction) {
      return;
    }

    startTransition(async () => {
      const result = confirmAction === 'approve'
        ? await approveRescheduleRequestAction({
            enrollmentId: enrollment.id,
            targetSessionId: request.targetSessionId,
            startsAt: createJakartaIso(startDate, startTime),
            endsAt: createJakartaIso(endDate, endTime),
            timezone: DEFAULT_TIMEZONE,
            teacherName,
            locationType,
            locationLabel,
            meetingUrl,
            adminNote,
          })
        : await rejectRescheduleRequestAction({
            enrollmentId: enrollment.id,
            adminNote,
          });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setConfirmAction(null);
      setAdminNote('');
      router.refresh();
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle>Permintaan Jadwal</CardTitle>
            <CardDescription>Review request perubahan jadwal dari siswa.</CardDescription>
          </div>
          {request ? <RescheduleRequestStatusBadge status={request.status} /> : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {!request ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Belum ada request reschedule untuk enrollment ini.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Diminta Pada" value={formatDashboardDate(request.requestedAt)} />
                <DetailItem label="Sesi" value={targetSession ? `${targetSession.title} (#${targetSession.sessionNumber})` : request.targetSessionId} />
                <DetailItem label="Status" value={<RescheduleRequestStatusBadge status={request.status} />} />
                {request.reviewedAt ? <DetailItem label="Direview Pada" value={formatDashboardDate(request.reviewedAt)} /> : null}
              </div>

              {targetSession ? (
                <div className="rounded-lg border p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailItem label="Jadwal Saat Ini" value={formatDashboardDate(targetSession.startsAt)} />
                    <DetailItem label="Selesai" value={formatDashboardDate(targetSession.endsAt)} />
                    <DetailItem label="Teacher" value={targetSession.teacherName || '-'} />
                    <DetailItem label="Status Sesi" value={<SessionStatusBadge status={targetSession.status} />} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Alasan siswa</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{request.reason || '-'}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Pilihan jadwal</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {request.preferredSlots.length > 0 ? request.preferredSlots.map((slot, index) => (
                      <div key={`${slot.startsAt}-${index}`} className="rounded-md bg-muted/50 p-3">
                        <p className="font-medium text-foreground">Opsi {index + 1}</p>
                        <p>{formatDashboardDate(slot.startsAt)} - {slot.endsAt ? formatDashboardDate(slot.endsAt) : 'Tanpa jam selesai'}</p>
                        {slot.note ? <p className="mt-1 whitespace-pre-line">{slot.note}</p> : null}
                      </div>
                    )) : (
                      <p>Tidak ada pilihan jadwal.</p>
                    )}
                  </div>
                </div>
              </div>

              {request.status === 'pending_admin_approval' ? (
                <div className="space-y-5 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred-slot">Sumber jadwal final</Label>
                    <Select value={selectedSlot} onValueChange={handlePreferredSlotChange}>
                      <SelectTrigger id="preferred-slot" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {request.preferredSlots.map((slot, index) => (
                          <SelectItem key={`${slot.startsAt}-${index}`} value={`${index}`}>
                            Opsi jadwal {index + 1}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Jadwal custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-start-date">Tanggal mulai</Label>
                      <Input id="reschedule-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-start-time">Jam mulai</Label>
                      <Input id="reschedule-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-end-date">Tanggal selesai</Label>
                      <Input id="reschedule-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-end-time">Jam selesai</Label>
                      <Input id="reschedule-end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-teacher">Nama teacher</Label>
                      <Input id="reschedule-teacher" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-location-type">Tipe lokasi</Label>
                      <Select value={locationType} onValueChange={(value) => setLocationType(value as ScheduleLocationType)}>
                        <SelectTrigger id="reschedule-location-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-location-label">Label lokasi</Label>
                      <Input id="reschedule-location-label" value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} />
                    </div>
                    {locationType === 'online' ? (
                      <div className="space-y-2">
                        <Label htmlFor="reschedule-meeting-url">Meeting URL</Label>
                        <Input id="reschedule-meeting-url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} />
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reschedule-admin-note">Catatan admin</Label>
                    <Textarea
                      id="reschedule-admin-note"
                      value={adminNote}
                      onChange={(event) => setAdminNote(event.target.value)}
                      placeholder="Catatan untuk siswa dan audit internal"
                      rows={4}
                    />
                  </div>

                  {isPending ? (
                    <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      Memproses request reschedule...
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={() => requestConfirmation('approve')} disabled={isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Setujui Permintaan
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => requestConfirmation('reject')} disabled={isPending}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Tolak Permintaan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Catatan review admin</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{request.adminNote || '-'}</p>
                  {request.approvedSession ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Jadwal disetujui: {formatDashboardDate(request.approvedSession.startsAt)} - {formatDashboardDate(request.approvedSession.endsAt)}
                    </p>
                  ) : null}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Setujui permintaan jadwal?' : 'Tolak permintaan jadwal?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Keputusan ini akan menyimpan hasil review dan mengembalikan status jadwal ke sudah diatur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
