import { notFound } from 'next/navigation';
import { ClassForm } from '@/features/classes/components/class-form';
import { getClassById } from '@/features/classes/data';

interface EditClassPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const { id } = await params;
  const classItem = await getClassById(id);

  if (!classItem) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Kelas</h1>
        <p className="mt-2 text-muted-foreground">{classItem.name.id || classItem.name.en}</p>
      </div>
      <ClassForm classItem={classItem} />
    </div>
  );
}
