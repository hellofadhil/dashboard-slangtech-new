import type { ClassType } from '@/features/classes/types';

export function getClassTypeLabel(type: ClassType): string {
  const labels: Record<ClassType, string> = {
    private: 'Private',
    group: 'Group',
  };

  return labels[type];
}
