'use client';

import { type ReactNode, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveManualPaymentAction,
  rejectManualPaymentAction,
} from '@/features/enrollments/actions';
import { PaymentStatusBadge } from '@/features/enrollments/components/enrollment-badges';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ClassEnrollment, EnrollmentStatus } from '@/lib/dashboard/types';
import { formatDashboardDate, formatRupiah } from '@/lib/dashboard/utils';

interface PaymentReviewPanelProps {
  enrollment: ClassEnrollment;
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

export function PaymentReviewPanel({ enrollment }: PaymentReviewPanelProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [nextEnrollmentStatus, setNextEnrollmentStatus] = useState<Extract<EnrollmentStatus, 'cancelled' | 'waiting_payment_confirmation'>>('cancelled');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const payment = enrollment.payment;
  const canReviewManualPayment =
    payment.method === 'manual' &&
    payment.status === 'waiting_confirmation' &&
    Boolean(payment.manual.proofUrl);

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveManualPaymentAction({ enrollmentId: enrollment.id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setApproveOpen(false);
      router.refresh();
    });
  };

  const handleReject = () => {
    if (!adminNote.trim()) {
      toast.error('Catatan admin wajib diisi');
      return;
    }

    startTransition(async () => {
      const result = await rejectManualPaymentAction({
        enrollmentId: enrollment.id,
        adminNote,
        nextEnrollmentStatus,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setRejectOpen(false);
      setAdminNote('');
      router.refresh();
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle>Pembayaran</CardTitle>
            <CardDescription>Review metode pembayaran, nominal, dan bukti transfer siswa.</CardDescription>
          </div>
          <PaymentStatusBadge status={payment.status} />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Metode" value={payment.method === 'manual' ? 'Transfer Manual' : 'Pembayaran Otomatis'} />
            <DetailItem label="Status" value={<PaymentStatusBadge status={payment.status} />} />
            <DetailItem label="Nominal" value={formatRupiah(payment.amount)} />
            <DetailItem label="Currency" value={payment.currency} />
            {payment.reviewedAt ? <DetailItem label="Direview Pada" value={formatDashboardDate(payment.reviewedAt)} /> : null}
            {payment.adminNote ? <DetailItem label="Catatan Admin" value={<p className="whitespace-pre-line font-normal">{payment.adminNote}</p>} /> : null}
          </div>

          {payment.method === 'manual' ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Bank" value={payment.manual.bankName || '-'} />
                <DetailItem label="Nomor Rekening" value={payment.manual.accountNumber || '-'} />
                <DetailItem label="Nama Rekening" value={payment.manual.accountHolderName || '-'} />
                <DetailItem label="Upload Bukti" value={formatDashboardDate(payment.manual.uploadedAt)} />
              </div>

              {payment.manual.proofUrl ? (
                <div className="space-y-3">
                  {payment.manual.proofContentType.startsWith('image/') ? (
                    <img
                      src={payment.manual.proofUrl}
                      alt={payment.manual.proofFileName || 'Payment proof'}
                      className="max-h-[420px] w-full rounded-lg border object-contain"
                    />
                  ) : null}
                  <Button variant="outline" asChild>
                    <a href={payment.manual.proofUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Buka Bukti
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Bukti pembayaran belum diunggah.
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => setApproveOpen(true)}
                  disabled={!canReviewManualPayment || isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Setujui Pembayaran
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={payment.status !== 'waiting_confirmation' || isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Tolak Pembayaran
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Provider" value={payment.gateway.provider || '-'} />
              <DetailItem label="Transaction ID" value={payment.gateway.transactionId || '-'} />
              <DetailItem
                label="Link Pembayaran"
                value={payment.gateway.paymentUrl ? (
                  <a className="text-link hover:underline" href={payment.gateway.paymentUrl} target="_blank" rel="noreferrer">
                    Buka link pembayaran
                  </a>
                ) : '-'}
              />
              <DetailItem label="Expired Pada" value={formatDashboardDate(payment.gateway.expiresAt)} />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui pembayaran manual?</AlertDialogTitle>
            <AlertDialogDescription>
              Status pembayaran akan menjadi berhasil, enrollment akan terkonfirmasi, dan jadwal awal akan disiapkan bila diperlukan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isPending}>
              Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak pembayaran manual</DialogTitle>
            <DialogDescription>
              Tambahkan catatan admin agar keputusan mudah dilacak.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-mode">Setelah ditolak</Label>
              <Select
                value={nextEnrollmentStatus}
                onValueChange={(value) => setNextEnrollmentStatus(value as typeof nextEnrollmentStatus)}
              >
                <SelectTrigger id="reject-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cancelled">Batalkan enrollment</SelectItem>
                  <SelectItem value="waiting_payment_confirmation">Minta siswa upload ulang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-admin-note">Catatan admin</Label>
              <Textarea
                id="payment-admin-note"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Contoh: Nominal transfer tidak sesuai invoice."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={isPending}>
              Tolak Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
