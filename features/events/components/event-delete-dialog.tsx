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
import { Event } from '@/lib/dashboard/types';

interface EventDeleteDialogProps {
  eventItem: Event | null;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function EventDeleteDialog({
  eventItem,
  isPending,
  onConfirm,
  onOpenChange,
}: EventDeleteDialogProps) {
  return (
    <AlertDialog open={!!eventItem} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Event?</AlertDialogTitle>
          <AlertDialogDescription>
            Event {eventItem?.name.id ?? eventItem?.name.en} beserta data pendukungnya akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Menghapus...' : 'Ya, Hapus Event'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
