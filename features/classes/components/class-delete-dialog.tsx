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
import { Class } from '@/lib/dashboard/types';

interface ClassDeleteDialogProps {
  classItem: Class | null;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ClassDeleteDialog({
  classItem,
  isPending,
  onConfirm,
  onOpenChange,
}: ClassDeleteDialogProps) {
  return (
    <AlertDialog open={!!classItem} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Program Kelas?</AlertDialogTitle>
          <AlertDialogDescription>
            Program kelas {classItem?.name.id ?? classItem?.name.en} beserta data pendukungnya akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Menghapus...' : 'Ya, Hapus Kelas'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
