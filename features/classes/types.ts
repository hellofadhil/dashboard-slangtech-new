import type { LocalizedText } from '@/features/shared/types';

export type ClassType = 'private' | 'group';

export type ClassImage = {
  url: string;
  alt: string;
};

export type Class = {
  id: string;
  slug: string;
  name: LocalizedText;
  type: ClassType;
  level: string;
  price: number;
  discountPrice?: number | null;
  longDescription: LocalizedText;
  totalSessions: number;
  sessionDurationMinutes: number;
  coverImage: string;
  images: ClassImage[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date | unknown;
  updatedAt: Date | unknown;
};

export type ClassInput = Omit<Class, 'id' | 'createdAt' | 'updatedAt'>;

export interface ClassQuery {
  type?: ClassType | 'all';
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}
