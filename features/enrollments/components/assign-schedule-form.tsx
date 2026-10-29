'use client';

import { type FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CalendarClock, Save, School, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { assignEnrollmentScheduleAction } from '@/features/enrollments/actions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_TIMEZONE,
  getClassDisplayName,
} from '@/features/enrollments/utils';
import type {
  ClassEnrollment,
  EnrollmentScheduleSession,
  ScheduleLocationType,
} from '@/lib/dashboard/types';
import type { Teacher } from '@/features/teachers/types';

type ScheduleFrequency = 'daily' | 'weekly' | 'manual';

type ManualSlot = {
  sessionNumber: number;
  date: string;
  time: string;
};

interface AssignScheduleFormProps {
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

function getTodayInJakarta(): string {
  return getJakartaParts(new Date().toISOString()).date;
}

function normalizeTimeInput(time: string): string {
  if (!time) {
    return '00:00:00';
  }

  return time.length === 5 ? `${time}:00` : time;
}

function createJakartaIso(date: string, time: string): string {
  if (!date || !time) {
    return '';
  }

  const parsedDate = new Date(`${date}T${normalizeTimeInput(time)}+07:00`);
  return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function formatScheduleDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

function toPositiveInteger(value: string, fallback: number): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.max(Math.floor(parsedValue), 1) : fallback;
}

function createDefaultManualSlots(totalSessions: number, startDate: string, startTime: string): ManualSlot[] {
  const firstStart = createJakartaIso(startDate, startTime);

  return Array.from({ length: totalSessions }, (_, index) => {
    const parts = getJakartaParts(addDays(firstStart, index));

    return {
      sessionNumber: index + 1,
      date: parts.date,
      time: parts.time,
    };
  });
}

function normalizeManualSlots(
  slots: ManualSlot[],
  totalSessions: number,
  startDate: string,
  startTime: string,
): ManualSlot[] {
  const defaults = createDefaultManualSlots(totalSessions, startDate, startTime);

  return defaults.map((slot, index) => ({
    ...slot,
    date: slots[index]?.date || slot.date,
    time: slots[index]?.time || slot.time,
  }));
}

function buildSessions({
  durationMinutes,
  frequency,
  locationLabel,
  locationType,
  manualSlots,
  meetingUrl,
  notes,
  startDate,
  startTime,
  teacherId,
  teacherName,
  totalSessions,
}: {
  durationMinutes: number;
  frequency: ScheduleFrequency;
  locationLabel: string;
  locationType: ScheduleLocationType;
  manualSlots: ManualSlot[];
  meetingUrl: string;
  notes: string;
  startDate: string;
  startTime: string;
  teacherId?: string;
  teacherName: string;
  totalSessions: number;
}): EnrollmentScheduleSession[] {
  const firstStart = createJakartaIso(startDate, startTime);
  const startsAtValues = frequency === 'manual'
    ? manualSlots.map((slot) => createJakartaIso(slot.date, slot.time))
    : Array.from({ length: totalSessions }, (_, index) => addDays(firstStart, index * (frequency === 'weekly' ? 7 : 1)));

  return startsAtValues.map((startsAt, index) => {
    const startTimeMs = new Date(startsAt).getTime();
    const endsAt = Number.isNaN(startTimeMs)
      ? ''
      : new Date(startTimeMs + durationMinutes * 60 * 1000).toISOString();
    const sessionNumber = index + 1;

    return {
      id: `session-${sessionNumber}`,
      sessionNumber,
      title: `Session ${sessionNumber}`,
      startsAt,
      endsAt,
      timezone: DEFAULT_TIMEZONE,
      teacherId,
      teacherName: teacherName.trim(),
      locationType,
      locationLabel: locationLabel.trim(),
      meetingUrl: locationType === 'online' ? meetingUrl.trim() : '',
      status: 'scheduled',
      notes: notes.trim(),
    };
  });
}

export function AssignScheduleForm({ enrollment, teachers = [] }: AssignScheduleFormProps) {
  const firstTeacher = teachers.length > 0 ? teachers[0] : null;
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    firstTeacher ? firstTeacher.id : '',
  );
  const [locationType, setLocationType] = useState<ScheduleLocationType>('online');
  const [locationLabel, setLocationLabel] = useState('Online Class');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [startDate, setStartDate] = useState(getTodayInJakarta);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(enrollment.classSnapshot.sessionDurationMinutes);
  const [totalSessions, setTotalSessions] = useState(enrollment.classSnapshot.totalSessions);
  const [frequency, setFrequency] = useState<ScheduleFrequency>('weekly');
  const [notes, setNotes] = useState('');
  const [manualSlots, setManualSlots] = useState<ManualSlot[]>(() => (
    createDefaultManualSlots(enrollment.classSnapshot.totalSessions, getTodayInJakarta(), '09:00')
  ));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId],
  );

  const teacherName = selectedTeacher
    ? (selectedTeacher.fullName || selectedTeacher.nickname || selectedTeacher.email)
    : '';

  useEffect(() => {
    setManualSlots((currentSlots) => normalizeManualSlots(currentSlots, totalSessions, startDate, startTime));
  }, [startDate, startTime, totalSessions]);

  const sessions = useMemo(() => buildSessions({
    durationMinutes,
    frequency,
    locationLabel,
    locationType,
    manualSlots,
    meetingUrl,
    notes,
    startDate,
    startTime,
    teacherId: selectedTeacher?.id,
    teacherName,
    totalSessions,
  }), [
    durationMinutes,
    frequency,
    locationLabel,
    locationType,
    manualSlots,
    meetingUrl,
    notes,
    startDate,
    startTime,
    selectedTeacher?.id,
    teacherName,
    totalSessions,
  ]);

  const updateManualSlot = (sessionNumber: number, updates: Partial<ManualSlot>) => {
    setManualSlots((currentSlots) => currentSlots.map((slot) => (
      slot.sessionNumber === sessionNumber ? { ...slot, ...updates } : slot
    )));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTeacher) {
      toast.error('Pilih guru pengajar dari Data Guru terlebih dahulu');
      return;
    }

    if (!locationLabel.trim()) {
      toast.error('Label lokasi wajib diisi');
      return;
    }

    if (locationType === 'online' && !meetingUrl.trim()) {
      toast.error('Meeting URL wajib diisi untuk kelas online');
      return;
    }

    if (sessions.some((session) => Number.isNaN(new Date(session.startsAt).getTime()) || Number.isNaN(new Date(session.endsAt).getTime()))) {
      toast.error('Tanggal dan waktu semua sesi harus valid');
      return;
    }

    setConfirmOpen(true);
  };

  const handleAssignSchedule = () => {
    startTransition(async () => {
      const result = await assignEnrollmentScheduleAction({
        enrollmentId: enrollment.id,
        sessions,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Atur jadwal untuk {getClassDisplayName(enrollment)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Default timezone: {DEFAULT_TIMEZONE}. Sesi akan dibuat otomatis dari pola jadwal di bawah.
              </p>
            </div>
          </div>
        </div>

        {teachers.length === 0 ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Belum Ada Data Guru Terdaftar
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Penjadwalan wajib terhubung dengan akun guru resmi SlangTech. Silakan tambahkan data guru terlebih dahulu di menu Data Guru.
                </p>
                <div className="pt-2">
                  <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs border-amber-400 dark:border-amber-800">
                    <Link href="/dashboard/teachers">
                      <School className="h-3.5 w-3.5" />
                      <span>Buka Menu Data Guru</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Guru Selection strictly from Data Guru */}
          <div className="space-y-2">
            <Label htmlFor="teacher-select">Guru / Pengajar (Data Guru)</Label>
            <Select
              value={selectedTeacherId}
              onValueChange={setSelectedTeacherId}
              disabled={teachers.length === 0}
            >
              <SelectTrigger id="teacher-select" className="w-full">
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
            <Label htmlFor="location-type">Tipe Lokasi</Label>
            <Select value={locationType} onValueChange={(value) => setLocationType(value as ScheduleLocationType)}>
              <SelectTrigger id="location-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-label">Nama Tempat / Platform</Label>
            <Input
              id="location-label"
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
              placeholder="Zoom / Google Meet / Classroom"
            />
          </div>

          {locationType === 'online' ? (
            <div className="space-y-2">
              <Label htmlFor="meeting-url">Tautan Meeting (URL)</Label>
              <Input
                id="meeting-url"
                value={meetingUrl}
                onChange={(event) => setMeetingUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="start-date">Tanggal mulai</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-time">Jam mulai</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durasi per sesi</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(toPositiveInteger(event.target.value, durationMinutes))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total-sessions">Total sesi</Label>
            <Input
              id="total-sessions"
              type="number"
              min={1}
              value={totalSessions}
              onChange={(event) => setTotalSessions(toPositiveInteger(event.target.value, totalSessions))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Pola jadwal</Label>
            <Select value={frequency} onValueChange={(value) => setFrequency(value as ScheduleFrequency)}>
              <SelectTrigger id="frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="manual">Custom / Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-notes">Catatan</Label>
          <Textarea
            id="schedule-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Catatan opsional untuk setiap sesi"
            rows={3}
          />
        </div>

        {frequency === 'manual' ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Waktu sesi manual</p>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Sesi</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam Mulai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualSlots.map((slot) => (
                    <TableRow key={slot.sessionNumber}>
                      <TableCell>Sesi {slot.sessionNumber}</TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={slot.date}
                          onChange={(event) => updateManualSlot(slot.sessionNumber, { date: event.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={slot.time}
                          onChange={(event) => updateManualSlot(slot.sessionNumber, { time: event.target.value })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium">Preview sesi otomatis</p>
          <div className="grid gap-2 md:grid-cols-2">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{session.title}</p>
                  {session.teacherName ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {session.teacherName}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatScheduleDateTime(session.startsAt)} - {formatScheduleDateTime(session.endsAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isPending || teachers.length === 0}>
          <Save className="mr-2 h-4 w-4" />
          Simpan Jadwal
        </Button>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan jadwal ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal enrollment akan diisi dengan {sessions.length} sesi belajar dengan pengajar {teacherName} dan status jadwal menjadi sudah diatur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignSchedule} disabled={isPending}>
              Simpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
