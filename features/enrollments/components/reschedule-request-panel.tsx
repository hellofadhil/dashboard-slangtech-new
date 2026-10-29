'use client';

import { type ReactNode, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, UserCheck, XCircle } from 'lucide-react';
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
import type { Teacher } from '@/features/teachers/types';
import { formatDashboardDate } from '@/lib/dashboard/utils';

interface RescheduleRequestPanelProps {
  enrollment: ClassEnrollment;
  teachers?: Teacher[];
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

export function RescheduleRequestPanel({ enrollment, teachers = [] }: RescheduleRequestPanelProps) {
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

  const matchedTeacher = targetSession?.teacherId
    ? teachers.find((t) => t.id === targetSession.teacherId)
    : teachers.find((t) => (t.fullName || t.nickname || t.email) === targetSession?.teacherName);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    matchedTeacher ? matchedTeacher.id : (teachers[0]?.id ?? ''),
  );

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId],
  );

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

    const startParts = getJakartaParts(slot.startsAt);
    setStartDate(startParts.date);
    setStartTime(startParts.time);

    const endIso = slot.endsAt || getFallbackEnd(slot.startsAt, targetSession);
    const endParts = getJakartaParts(endIso);
    setEndDate(endParts.date);
    setEndTime(endParts.time);
  };

  const handleApplyAction = () => {
    if (!confirmAction || !request) {
      return;
    }

    if (!adminNote.trim()) {
      toast.error('Catatan admin wajib diisi');
      return;
    }

    if (confirmAction === 'approve') {
      if (!selectedTeacher) {
        toast.error('Pilih guru pengajar dari Data Guru terlebih dahulu');
        return;
      }

      const startIso = createJakartaIso(startDate, startTime);
      const endIso = createJakartaIso(endDate, endTime);

      if (!startIso || !endIso) {
        toast.error('Jadwal baru belum valid');
        return;
      }

      if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
        toast.error('Jam selesai harus setelah jam mulai');
        return;
      }

      if (locationType === 'online' && !meetingUrl.trim()) {
        toast.error('Meeting URL wajib diisi untuk kelas online');
        return;
      }
    }

    const teacherName = selectedTeacher
      ? (selectedTeacher.fullName || selectedTeacher.nickname || selectedTeacher.email)
      : '';

    startTransition(async () => {
      const result = confirmAction === 'approve'
        ? await approveRescheduleRequestAction({
            enrollmentId: enrollment.id,
            targetSessionId: request.targetSessionId,
            startsAt: createJakartaIso(startDate, startTime),
            endsAt: createJakartaIso(endDate, endTime),
            timezone: DEFAULT_TIMEZONE,
            teacherId: selectedTeacher?.id,
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
            <CardDescription>Tinjau permohonan perubahan jadwal belajar dari siswa.</CardDescription>
          </div>
          {request ? <RescheduleRequestStatusBadge status={request.status} /> : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {!request ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Belum ada permohonan perubahan jadwal untuk pendaftaran ini.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Diminta Pada" value={formatDashboardDate(request.requestedAt)} />
                <DetailItem label="Sesi" value={targetSession ? `${targetSession.title} (#${targetSession.sessionNumber})` : request.targetSessionId} />
                <DetailItem label="Status" value={<RescheduleRequestStatusBadge status={request.status} />} />
                {request.reviewedAt ? <DetailItem label="Ditinjau Pada" value={formatDashboardDate(request.reviewedAt)} /> : null}
              </div>

              {targetSession ? (
                <div className="rounded-lg border p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailItem label="Jadwal Saat Ini" value={formatDashboardDate(targetSession.startsAt)} />
                    <DetailItem label="Pengajar Saat Ini" value={targetSession.teacherName || '-'} />
                    <DetailItem label="Lokasi" value={`${targetSession.locationType} (${targetSession.locationLabel})`} />
                    <DetailItem label="Status Sesi" value={<SessionStatusBadge status={targetSession.status} />} />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">Alasan siswa</p>
                <div className="rounded-lg bg-muted/40 p-4 text-sm whitespace-pre-wrap">
                  {request.reason || '-'}
                </div>
              </div>

              {request.status === 'pending_admin_approval' ? (
                <div className="space-y-4 rounded-lg border p-4">
                  <p className="font-medium">Opsi jadwal persetujuan</p>

                  <div className="space-y-2">
                    <Label htmlFor="preferred-slot">Pilihan jadwal siswa</Label>
                    <Select value={selectedSlot} onValueChange={handlePreferredSlotChange}>
                      <SelectTrigger id="preferred-slot" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {request.preferredSlots.map((slot, index) => (
                          <SelectItem key={`${slot.startsAt}-${index}`} value={String(index)}>
                            Pilihan {index + 1}: {formatDashboardDate(slot.startsAt)}
                            {slot.note ? ` (${slot.note})` : ''}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Tentukan manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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

                    {/* Teacher strictly from Data Guru */}
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-teacher-select">Guru / Pengajar (Data Guru)</Label>
                      <Select
                        value={selectedTeacherId}
                        onValueChange={setSelectedTeacherId}
                        disabled={teachers.length === 0}
                      >
                        <SelectTrigger id="reschedule-teacher-select" className="w-full">
                          <SelectValue placeholder="Pilih guru terdaftar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.fullName} ({teacher.nickname || teacher.username || teacher.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTeacher ? (
                        <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="h-3 w-3" />
                          <span>Terhubung ke akun guru: {selectedTeacher.fullName}</span>
                        </p>
                      ) : null}
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
                    <Label htmlFor="reschedule-admin-note">Catatan admin (wajib)</Label>
                    <Textarea
                      id="reschedule-admin-note"
                      value={adminNote}
                      onChange={(event) => setAdminNote(event.target.value)}
                      placeholder="Tulis alasan persetujuan atau penolakan jadwal"
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => setConfirmAction('approve')}
                      disabled={isPending || !selectedTeacher}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Setujui Reschedule
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => setConfirmAction('reject')} disabled={isPending}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Tolak Reschedule
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Setujui permohonan jadwal ini?' : 'Tolak permohonan jadwal ini?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve'
                ? `Jadwal sesi akan diperbarui dengan waktu yang ditentukan dan pengajar ${selectedTeacher?.fullName || ''}.`
                : 'Permohonan akan ditolak dan siswa akan melihat catatan admin ini.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyAction} disabled={isPending}>
              {confirmAction === 'approve' ? 'Setujui' : 'Tolak'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
