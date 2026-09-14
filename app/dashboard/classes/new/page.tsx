import { ClassForm } from '@/features/classes/components/class-form';

export default function NewClassPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Kelas</h1>
        <p className="mt-2 text-muted-foreground">
          Buat program kelas bahasa baru.
        </p>
      </div>
      <ClassForm />
    </div>
  );
}
