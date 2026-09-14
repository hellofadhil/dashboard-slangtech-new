import type { Event, EventPriceType } from '@/features/events/types';
import { formatRupiah } from '@/features/shared/utils';

export function getEventPriceTypeLabel(priceType: EventPriceType): string {
  const labels: Record<EventPriceType, string> = {
    free: 'Free',
    paid: 'Paid',
  };

  return labels[priceType];
}

export function getEventDisplayPrice(eventItem: Event): string {
  return eventItem.priceType === 'free' ? 'Free' : formatRupiah(eventItem.price);
}

export function getEventTrainerNames(eventItem: Event): string {
  return eventItem.trainers.map((trainer) => trainer.name).join(', ') || '-';
}
