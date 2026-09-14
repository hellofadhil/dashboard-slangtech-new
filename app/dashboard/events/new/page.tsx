import { EventForm } from '@/features/events/components/event-form';

export default function NewEventPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Event</h1>
        <p className="mt-2 text-muted-foreground">
          Buat event baru dengan trainer, sesi, narahubung, dan gambar.
        </p>
      </div>
      <EventForm />
    </div>
  );
}
