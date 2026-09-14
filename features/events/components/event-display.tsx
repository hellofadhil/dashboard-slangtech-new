import { Event } from '@/lib/dashboard/types';
import { getEventDisplayPrice } from '@/lib/dashboard/utils';

export function EventPriceDisplay({ eventItem }: { eventItem: Event }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="truncate font-semibold" title={getEventDisplayPrice(eventItem)}>
        {getEventDisplayPrice(eventItem)}
      </p>
      <p className="truncate text-sm text-muted-foreground">
        {eventItem.priceType === 'free' ? 'Tanpa upload pembayaran' : 'Berbayar'}
      </p>
    </div>
  );
}

export function EventImagePreview({ eventItem }: { eventItem: Event }) {
  if (!eventItem.coverImage) {
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
        title="Tanpa Cover"
      >
        -
      </div>
    );
  }

  return (
    <img
      src={eventItem.coverImage}
      alt={eventItem.name.en || eventItem.name.id}
      className="h-14 w-14 shrink-0 rounded-md border object-cover"
    />
  );
}
