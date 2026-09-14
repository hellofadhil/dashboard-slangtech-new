import { Badge } from '@/components/ui/badge';
import { Class, ClassType } from '@/lib/dashboard/types';
import {
  getBadgeClass,
  getClassTypeLabel,
} from '@/lib/dashboard/utils';

export function ClassTypeBadge({ type }: { type: ClassType }) {
  return (
    <Badge variant="outline" className={getBadgeClass(type === 'private' ? 'green' : 'gray')}>
      {getClassTypeLabel(type)}
    </Badge>
  );
}

export function ClassStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant="outline" className={getBadgeClass(isActive ? 'green' : 'gray')}>
      {isActive ? 'Aktif' : 'Tidak Aktif'}
    </Badge>
  );
}

export function ClassFlagBadges({ classItem }: { classItem: Class }) {
  if (!classItem.isFeatured) {
    return <span className="text-sm text-muted-foreground">Tidak featured</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className={getBadgeClass('blue')}>
        Featured
      </Badge>
    </div>
  );
}
