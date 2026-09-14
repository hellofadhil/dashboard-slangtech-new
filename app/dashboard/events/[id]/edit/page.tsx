import { notFound } from 'next/navigation';
import { EventForm } from '@/features/events/components/event-form';
import { getEventById } from '@/features/events/data';

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const eventItem = await getEventById(id);

  if (!eventItem) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
        <p className="mt-2 text-muted-foreground">{eventItem.name.id || eventItem.name.en}</p>
      </div>
      <EventForm eventItem={eventItem} />
    </div>
  );
}
