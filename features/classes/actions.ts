'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentAdminUser } from '@/lib/auth/server';
import { deleteFilesFromR2 } from '@/lib/r2/server';
import { ClassSchema, type ClassFormInput } from '@/features/classes/schemas';
import {
  createClass,
  deleteClass,
  getClassById,
  isClassSlugTaken,
  updateClass,
} from '@/features/classes/data';
import type { Class, ClassInput } from '@/features/classes/types';
import type { ActionResult } from '@/features/shared/types';
import {
  getRemovedUrls,
  normalizeLocalizedText,
  revalidateDashboard,
  validationError,
} from '@/features/shared/action-utils';

function normalizeClassInput(input: ClassFormInput): ClassInput {
  return {
    slug: input.slug,
    name: normalizeLocalizedText(input.name),
    type: input.type,
    level: input.level.trim(),
    price: input.price,
    discountPrice: input.discountPrice,
    longDescription: normalizeLocalizedText(input.longDescription),
    totalSessions: input.totalSessions,
    sessionDurationMinutes: input.sessionDurationMinutes,
    coverImage: input.coverImage,
    images: input.images.map((image) => ({
      url: image.url,
      alt: image.alt.trim(),
    })),
    isActive: input.isActive,
    isFeatured: input.isFeatured,
  };
}

function getClassImageUrls(classItem: Class | null): string[] {
  if (!classItem) {
    return [];
  }

  return [classItem.coverImage, ...classItem.images.map((image) => image.url)].filter(Boolean);
}

export async function createClassAction(input: unknown): Promise<ActionResult<Class>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<Class>('Sesi admin tidak valid');
    }

    const parsed = ClassSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<Class>('Data kelas belum valid', parsed.error.flatten().fieldErrors);
    }

    if (await isClassSlugTaken(parsed.data.slug)) {
      return validationError<Class>('Slug sudah digunakan', { slug: ['Slug sudah digunakan'] });
    }

    const classItem = await createClass(normalizeClassInput(parsed.data));
    revalidateDashboard();
    return { success: true, message: 'Kelas berhasil ditambahkan', data: classItem };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menyimpan data kelas',
    };
  }
}

export async function updateClassAction(id: string, input: unknown): Promise<ActionResult<Class>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<Class>('Sesi admin tidak valid');
    }

    const parsed = ClassSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<Class>('Data kelas belum valid', parsed.error.flatten().fieldErrors);
    }

    const [existingClass, slugTaken] = await Promise.all([
      getClassById(id),
      isClassSlugTaken(parsed.data.slug, id),
    ]);

    if (!existingClass) {
      return validationError<Class>('Kelas tidak ditemukan');
    }

    if (slugTaken) {
      return validationError<Class>('Slug sudah digunakan', { slug: ['Slug sudah digunakan'] });
    }

    const normalizedInput = normalizeClassInput(parsed.data);
    const classItem = await updateClass(id, normalizedInput);
    await deleteFilesFromR2(getRemovedUrls(
      getClassImageUrls(existingClass),
      [normalizedInput.coverImage, ...normalizedInput.images.map((image) => image.url)],
    ));
    revalidatePath(`/dashboard/classes/${id}`);
    revalidatePath(`/dashboard/classes/${id}/edit`);
    revalidateDashboard();
    return { success: true, message: 'Kelas berhasil diperbarui', data: classItem };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menyimpan data kelas',
    };
  }
}

export async function deleteClassAction(id: string): Promise<ActionResult> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError('Sesi admin tidak valid');
    }

    const classItem = await getClassById(id);
    if (!classItem) {
      return validationError('Kelas tidak ditemukan');
    }

    await deleteClass(id);
    await deleteFilesFromR2(getClassImageUrls(classItem));
    revalidateDashboard();
    return { success: true, message: 'Kelas berhasil dihapus' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menghapus kelas',
    };
  }
}
