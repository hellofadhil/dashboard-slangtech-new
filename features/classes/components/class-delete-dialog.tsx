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
          <AlertDialogTitle>Hapus Kelas?</AlertDialogTitle>
          <AlertDialogDescription>
            Kelas {classItem?.name.id ?? classItem?.name.en} akan dihapus dari Firestore.
            Gambar yang terkait akan dibersihkan dari R2 memakai utilitas upload yang sudah ada.
            Tindakan ini tidak bisa dibatalkan.
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
