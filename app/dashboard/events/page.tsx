import { EventTable } from '@/features/events/components/event-table';
import { DataLoadAlert } from '@/components/dashboard/data-load-alert';
import { emptyEvents, safelyLoad } from '@/lib/dashboard/safe-data';
import { EventQuery } from '@/lib/dashboard/types';
import { getEvents } from '@/features/events/data';

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseEventQuery(searchParams: Record<string, string | string[] | undefined>): EventQuery {
  const priceType = getParam(searchParams, 'priceType');
  const status = getParam(searchParams, 'status');

  return {
    search: getParam(searchParams, 'search') ?? '',
    priceType: priceType === 'free' || priceType === 'paid' ? priceType : 'all',
    status: status === 'active' || status === 'inactive' ? status : 'all',
  };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseEventQuery(await searchParams);
  const eventsResult = await safelyLoad(getEvents, emptyEvents);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Event</h1>
        <p className="text-muted-foreground">
          Kelola event, trainer, harga, sesi, narahubung, dan gambar.
        </p>
      </div>
      <DataLoadAlert message={eventsResult.error} />
      <EventTable events={eventsResult.data} filters={filters} />
    </div>
  );
}
