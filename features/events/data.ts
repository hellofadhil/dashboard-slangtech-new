import 'server-only';

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import type {
  Event,
  EventContact,
  EventInput,
  EventPriceType,
  EventSession,
  EventTrainer,
} from '@/features/events/types';
import {
  asBoolean,
  asDateValue,
  asNumber,
  asRecord,
  asString,
  normalizeLocalizedText,
  removeUndefined,
} from '@/features/shared/firestore-data';

const db = getFirestore(app);

function normalizeEventPriceType(value: unknown): EventPriceType {
  return value === 'paid' ? 'paid' : 'free';
}

function normalizeEventTrainer(value: unknown, index: number): EventTrainer {
  const data = asRecord(value);
  const fallbackName = typeof value === 'string' ? value : '';
  const name = asString(data.name, fallbackName).trim();

  return {
    id: asString(data.id, name ? `${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `${index}`),
    name,
  };
}

function normalizeEventContact(value: unknown): EventContact {
  const data = asRecord(value);

  return {
    name: asString(data.name),
    whatsappNumber: asString(data.whatsappNumber, asString(data.whatsapp)),
  };
}

function toIsoString(value: unknown): string {
  const dateValue = asDateValue(value);

  if (dateValue instanceof Date) {
    return dateValue.toISOString();
  }

  return asString(dateValue);
}

function normalizeEventSession(value: unknown, index: number): EventSession {
  const data = asRecord(value);
  const sessionNumber = Math.max(asNumber(data.sessionNumber, index + 1), 1);

  return {
    id: asString(data.id, `session-${sessionNumber}`),
    sessionNumber,
    title: asString(data.title, `Session ${sessionNumber}`),
    startsAt: toIsoString(data.startsAt),
    timezone: asString(data.timezone, 'Asia/Jakarta'),
    notes: asString(data.notes),
  };
}

function createFallbackEventSessions(data: Record<string, unknown>): EventSession[] {
  const startsAt = toIsoString(data.startsAt);

  if (!startsAt) {
    return [];
  }

  const totalSessions = Math.max(asNumber(data.totalSessions, 1), 1);

  return Array.from({ length: totalSessions }, (_, index) => ({
    id: `session-${index + 1}`,
    sessionNumber: index + 1,
    title: `Session ${index + 1}`,
    startsAt: index === 0 ? startsAt : '',
    timezone: asString(data.timezone, 'Asia/Jakarta'),
    notes: '',
  }));
}

function normalizeEvent(rawData: unknown, id: string): Event {
  const data = asRecord(rawData);
  const rawImages = Array.isArray(data.images) ? data.images : [];
  const rawTrainers = Array.isArray(data.trainers) ? data.trainers : [];
  const rawSessions = Array.isArray(data.sessions) ? data.sessions : [];
  const sessions = rawSessions.length
    ? rawSessions.map(normalizeEventSession).filter((session) => session.startsAt)
    : createFallbackEventSessions(data);
  const priceType = normalizeEventPriceType(data.priceType);

  return {
    id: asString(data.id, id),
    slug: asString(data.slug),
    name: normalizeLocalizedText(data.name),
    longDescription: normalizeLocalizedText(data.longDescription),
    priceType,
    price: priceType === 'free' ? 0 : asNumber(data.price),
    sessions,
    startsAt: sessions[0]?.startsAt ?? toIsoString(data.startsAt),
    timezone: asString(data.timezone, 'Asia/Jakarta'),
    trainers: rawTrainers
      .map(normalizeEventTrainer)
      .filter((trainer) => trainer.name),
    contact: normalizeEventContact(data.contact),
    coverImage: asString(data.coverImage),
    images: rawImages.map((imageRaw) => {
      const image = asRecord(imageRaw);
      return {
        url: asString(image.url, typeof imageRaw === 'string' ? imageRaw : ''),
        alt: asString(image.alt, asString(data.name ? asRecord(data.name).en : undefined)),
      };
    }).filter((image) => image.url),
    isActive: asBoolean(data.isActive, true),
    isFeatured: asBoolean(data.isFeatured),
    createdAt: asDateValue(data.createdAt),
    updatedAt: asDateValue(data.updatedAt),
  };
}

function getEventTimestamp(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  return 0;
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => (
    getEventTimestamp(b.createdAt) - getEventTimestamp(a.createdAt) ||
    a.name.id.localeCompare(b.name.id)
  ));
}

function eventInputToFirestore(input: EventInput): Record<string, unknown> {
  return removeUndefined(input) as Record<string, unknown>;
}

export async function getEvents(): Promise<Event[]> {
  try {
    const snapshot = await getDocs(query(
      collection(db, 'events'),
      orderBy('createdAt', 'desc'),
    ));

    return snapshot.docs.map((eventDoc) => normalizeEvent(eventDoc.data(), eventDoc.id));
  } catch {
    const snapshot = await getDocs(collection(db, 'events'));
    return sortEvents(snapshot.docs.map((eventDoc) => normalizeEvent(eventDoc.data(), eventDoc.id)));
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  const snapshot = await getDoc(doc(db, 'events', id));
  return snapshot.exists() ? normalizeEvent(snapshot.data(), snapshot.id) : null;
}

export async function isEventSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const events = await getEvents();
  return events.some((eventItem) => eventItem.slug === slug && eventItem.id !== excludeId);
}

export async function createEvent(input: EventInput): Promise<Event> {
  const ref = doc(collection(db, 'events'));
  const timestamp = new Date();
  const nextEvent: Event = {
    id: ref.id,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await setDoc(ref, {
    ...eventInputToFirestore(input),
    id: ref.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return nextEvent;
}

export async function updateEvent(id: string, updates: EventInput): Promise<Event> {
  const existing = await getEventById(id);
  if (!existing) {
    throw new Error('Event tidak ditemukan');
  }

  const updatedAt = new Date();
  await updateDoc(doc(db, 'events', id), {
    ...eventInputToFirestore(updates),
    id,
    totalSessions: deleteField(),
    sessionDurationMinutes: deleteField(),
    discountPrice: deleteField(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...existing,
    ...updates,
    id,
    createdAt: existing.createdAt,
    updatedAt,
  };
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'events', id));
}
