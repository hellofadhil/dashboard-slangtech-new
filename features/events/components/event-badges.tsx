import { Badge } from '@/components/ui/badge';
import { EventPriceType } from '@/lib/dashboard/types';
import { getBadgeClass, getEventPriceTypeLabel } from '@/lib/dashboard/utils';

export function EventPriceTypeBadge({ priceType }: { priceType: EventPriceType }) {
  return (
    <Badge variant="outline" className={getBadgeClass(priceType === 'free' ? 'green' : 'blue')}>
      {getEventPriceTypeLabel(priceType)}
    </Badge>
  );
}

export function EventStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant="outline" className={getBadgeClass(isActive ? 'green' : 'gray')}>
      {isActive ? 'Aktif' : 'Tidak Aktif'}
    </Badge>
  );
}
