import type { ClassType } from '@/features/classes/types';

export const CLASS_TYPE_OPTIONS: Array<{
  value: ClassType;
  label: string;
}> = [
  { value: 'private', label: 'Private' },
  { value: 'group', label: 'Group' },
];

export const CLASS_LEVEL_OPTIONS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
] as const;
