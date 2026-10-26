'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  RotateCcw,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ZawaSessionView } from '@/features/zawa/types';

interface ZawaSessionManagerProps {
  initialSession: ZawaSessionView | null;
}

interface ZawaSessionApiResponse {
  success: boolean;
  message?: string;
  data?: ZawaSessionView;
}

type SessionAction = 'create' | 'refresh' | 'reset' | 'delete' | null;

function getQrCodeSrc(qrcode: string): string {
  if (!qrcode) {
    return '';
  }

  return qrcode.startsWith('data:image') ? qrcode : `data:image/png;base64,${qrcode}`;
}

function formatDateTime(value: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusLabel(session: ZawaSessionView | null): string {
  if (!session) {
    return 'Belum ada sesi';
  }

  if (session.isConnected) {
    return 'Terhubung';
  }

  if (session.status === 'error') {
    return 'Error';
  }

  return session.qrcode ? 'Menunggu scan' : 'Belum terhubung';
}

function getStatusVariant(session: ZawaSessionView | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!session) {
    return 'secondary';
  }

  if (session.status === 'error') {
    return 'destructive';
  }

  return session.isConnected ? 'default' : 'outline';
}

async function readSessionResponse(response: Response): Promise<ZawaSessionApiResponse> {
  const body = await response.json().catch(() => ({}));
  return body as ZawaSessionApiResponse;
}

export function ZawaSessionManager({ initialSession }: ZawaSessionManagerProps) {
  const [session, setSession] = useState<ZawaSessionView | null>(initialSession);
  const [error, setError] = useState('');
  const [action, setAction] = useState<SessionAction>(null);
  const bootstrappedRef = useRef(false);

  const requestSession = useCallback(async (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    nextAction: SessionAction,
    silent = false,
  ) => {
    if (!silent) {
      setAction(nextAction);
    }

    try {
      const response = await fetch('/api/zawa/session', {
        method,
        headers: { Accept: 'application/json' },
      });
      const result = await readSessionResponse(response);

      if (!response.ok) {
        if (result.data) {
          setSession(result.data);
        }

        throw new Error(result.message || 'Request session Zawa gagal');
      }

      setError('');

      if (method === 'DELETE') {
        setSession(null);
        if (!silent) {
          toast.success('Sesi WhatsApp berhasil dihapus');
        }
        return null;
      }

      if (result.data) {
        setSession(result.data);
      }

      if (!silent) {
        const messages: Record<Exclude<SessionAction, null>, string> = {
          create: 'Sesi WhatsApp berhasil dibuat',
          refresh: 'Status WhatsApp berhasil diperbarui',
          reset: 'Sesi WhatsApp berhasil direset',
          delete: 'Sesi WhatsApp berhasil dihapus',
        };
        toast.success(messages[nextAction as Exclude<SessionAction, null>]);
      }

      return result.data ?? null;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Request session Zawa gagal';
      setError(message);

      if (!silent) {
        toast.error(message);
      }

      return null;
    } finally {
      if (!silent) {
        setAction(null);
      }
    }
  }, []);

  const createSession = useCallback(async (silent = false) => {
    return requestSession('POST', 'create', silent);
  }, [requestSession]);

  const refreshSession = useCallback(async (silent = false) => {
    const nextSession = await requestSession('GET', 'refresh', silent);

    if (!nextSession && session) {
      await createSession(true);
    }
  }, [createSession, requestSession, session]);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;

    if (initialSession) {
      void refreshSession(true);
      return;
    }

    void createSession(true);
  }, [createSession, initialSession, refreshSession]);

  useEffect(() => {
    if (session?.isConnected) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSession(true);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [refreshSession, session?.id, session?.isConnected]);

  const isBusy = action !== null;
  const qrCode = session && !session.isConnected ? session.qrcode : '';
  const hasQrCode = Boolean(qrCode);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
              <QrCode className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle>Koneksi WhatsApp</CardTitle>
              <CardDescription>
                Pindai kode QR menggunakan akun WhatsApp yang digunakan untuk notifikasi.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant={getStatusVariant(session)}>
              {getStatusLabel(session)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <WifiOff className="size-4" />
              <AlertTitle>Sinkronisasi gagal</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex min-h-[320px] items-center justify-center rounded-lg border bg-muted/40 p-4">
            {session?.isConnected ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="size-12" />
                </div>
                <div>
                  <p className="text-lg font-semibold">WhatsApp sudah terhubung</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Layanan notifikasi otomatis ke siswa siap digunakan.
                  </p>
                </div>
              </div>
            ) : hasQrCode ? (
              <img
                src={getQrCodeSrc(qrCode)}
                alt="QR code WhatsApp"
                className="aspect-square w-full max-w-72 rounded-md border bg-white p-3"
              />
            ) : (
              <div className="flex w-full max-w-72 flex-col items-center gap-4">
                <Skeleton className="aspect-square w-full" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Menyiapkan kode QR...
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!session && (
              <Button onClick={() => void createSession()} disabled={isBusy}>
                {action === 'create' ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                Hubungkan WhatsApp
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => void refreshSession()}
              disabled={isBusy || !session}
            >
              {action === 'refresh' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Perbarui Status
            </Button>
            <Button
              variant="outline"
              onClick={() => void requestSession('PUT', 'reset')}
              disabled={isBusy || !session}
            >
              {action === 'reset' ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Reset Koneksi
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isBusy || !session}>
                  <Trash2 className="size-4" />
                  Putus Koneksi
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Putus Koneksi WhatsApp?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Koneksi WhatsApp akan diputus dan sesi login akan dihapus. Anda perlu memindai kode QR baru jika ingin mengaktifkan kembali pengiriman notifikasi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => void requestSession('DELETE', 'delete')}
                  >
                    Ya, Putus Koneksi
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Info Koneksi</CardTitle>
          <CardDescription>
            Rincian status koneksi WhatsApp yang saat ini aktif.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm">
            {[
              ['ID', session?.id || '-'],
              ['Session ID', session?.sessionId || '-'],
              ['Dibuat', formatDateTime(session?.createdAt || '')],
              ['Sinkron terakhir', formatDateTime(session?.lastSyncedAt || '')],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={cn('break-all font-medium', value === '-' && 'text-muted-foreground')}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
