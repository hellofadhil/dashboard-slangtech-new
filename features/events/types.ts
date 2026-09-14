import type { LocalizedText } from '@/features/shared/types';

export type EventPriceType = 'free' | 'paid';

export type EventImage = {
  url: string;
  alt: string;
};

export type EventTrainer = {
  id: string;
  name: string;
};

export type EventContact = {
  name: string;
  whatsappNumber: string;
};

export type EventSession = {
  id: string;
  sessionNumber: number;
  title: string;
  startsAt: string;
  timezone: string;
  notes: string;
};

export type Event = {
  id: string;
  slug: string;
  name: LocalizedText;
  longDescription: LocalizedText;
  priceType: EventPriceType;
  price: number;
  sessions: EventSession[];
  startsAt: string;
  timezone: string;
  trainers: EventTrainer[];
  contact: EventContact;
  coverImage: string;
  images: EventImage[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date | unknown;
  updatedAt: Date | unknown;
};

export type EventInput = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;

export interface EventQuery {
  priceType?: EventPriceType | 'all';
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}
