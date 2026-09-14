import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DataLoadAlert({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Gagal memuat data</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
