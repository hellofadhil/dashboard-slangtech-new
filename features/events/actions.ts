'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentAdminUser } from '@/lib/auth/server';
import { deleteFilesFromR2 } from '@/lib/r2/server';
import { EventSchema, type EventFormInput } from '@/features/events/schemas';
import {
  createEvent,
  deleteEvent,
  getEventById,
  isEventSlugTaken,
  updateEvent,
} from '@/features/events/data';
import { syncEventEnrollmentSnapshots } from '@/features/event-enrollments/data';
import type { Event, EventInput } from '@/features/events/types';
import type { ActionResult } from '@/features/shared/types';
import {
  getRemovedUrls,
  normalizeJakartaDateTime,
  normalizeLocalizedText,
  revalidateDashboard,
  validationError,
} from '@/features/shared/action-utils';

function normalizeEventInput(input: EventFormInput): EventInput {
  return {
    slug: input.slug,
    name: normalizeLocalizedText(input.name),
    longDescription: normalizeLocalizedText(input.longDescription),
    priceType: input.priceType,
    price: input.priceType === 'free' ? 0 : input.price,
    sessions: input.sessions.map((session, index) => ({
      id: session.id.trim(),
      sessionNumber: index + 1,
      title: session.title.trim(),
      startsAt: normalizeJakartaDateTime(session.startsAt),
      timezone: session.timezone.trim() || 'Asia/Jakarta',
      notes: session.notes.trim(),
    })),
    startsAt: normalizeJakartaDateTime(input.sessions[0]?.startsAt ?? ''),
    timezone: input.timezone.trim() || 'Asia/Jakarta',
    trainers: input.trainers.map((trainer) => ({
      id: trainer.id.trim(),
      name: trainer.name.trim(),
    })),
    contact: {
      name: input.contact.name.trim(),
      whatsappNumber: input.contact.whatsappNumber.trim(),
    },
    coverImage: input.coverImage,
    images: input.images.map((image) => ({
      url: image.url,
      alt: image.alt.trim(),
    })),
    isActive: input.isActive,
    isFeatured: input.isFeatured,
  };
}

function getEventImageUrls(eventItem: Event | null): string[] {
  if (!eventItem) {
    return [];
  }

  return [eventItem.coverImage, ...eventItem.images.map((image) => image.url)].filter(Boolean);
}

export async function createEventAction(input: unknown): Promise<ActionResult<Event>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<Event>('Sesi admin tidak valid');
    }

    const parsed = EventSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<Event>('Data event belum valid', parsed.error.flatten().fieldErrors);
    }

    if (await isEventSlugTaken(parsed.data.slug)) {
      return validationError<Event>('Slug sudah digunakan', { slug: ['Slug sudah digunakan'] });
    }

    const eventItem = await createEvent(normalizeEventInput(parsed.data));
    revalidateDashboard();
    return { success: true, message: 'Event berhasil ditambahkan', data: eventItem };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menyimpan data event',
    };
  }
}

export async function updateEventAction(id: string, input: unknown): Promise<ActionResult<Event>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<Event>('Sesi admin tidak valid');
    }

    const parsed = EventSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<Event>('Data event belum valid', parsed.error.flatten().fieldErrors);
    }

    const [existingEvent, slugTaken] = await Promise.all([
      getEventById(id),
      isEventSlugTaken(parsed.data.slug, id),
    ]);

    if (!existingEvent) {
      return validationError<Event>('Event tidak ditemukan');
    }

    if (slugTaken) {
      return validationError<Event>('Slug sudah digunakan', { slug: ['Slug sudah digunakan'] });
    }

    const normalizedInput = normalizeEventInput(parsed.data);
    const eventItem = await updateEvent(id, normalizedInput);
    await syncEventEnrollmentSnapshots(eventItem);
    await deleteFilesFromR2(getRemovedUrls(
      getEventImageUrls(existingEvent),
      [normalizedInput.coverImage, ...normalizedInput.images.map((image) => image.url)],
    ));
    revalidatePath(`/dashboard/events/${id}`);
    revalidatePath(`/dashboard/events/${id}/edit`);
    revalidateDashboard();
    return { success: true, message: 'Event berhasil diperbarui', data: eventItem };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menyimpan data event',
    };
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError('Sesi admin tidak valid');
    }

    const eventItem = await getEventById(id);
    if (!eventItem) {
      return validationError('Event tidak ditemukan');
    }

    await deleteEvent(id);
    await deleteFilesFromR2(getEventImageUrls(eventItem));
    revalidateDashboard();
    return { success: true, message: 'Event berhasil dihapus' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menghapus event',
    };
  }
}
