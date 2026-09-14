'use server';

import { revalidatePath } from 'next/cache';
import {
  createFirebaseAuthUser,
  deleteFirebaseAuthUser,
} from '@/lib/auth/firebase-auth-rest';
import { getCurrentAdminUser } from '@/lib/auth/server';
import { TeacherCreateSchema, TeacherSchema } from '@/features/teachers/schemas';
import {
  createTeacher,
  deleteTeacher,
  getTeacherById,
  updateTeacher,
} from '@/features/teachers/data';
import type { Teacher } from '@/features/teachers/types';
import type { ActionResult } from '@/features/shared/types';
import { validationError } from '@/features/shared/action-utils';

function revalidateTeachers(): void {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/teachers');
}

export async function createTeacherAction(input: unknown): Promise<ActionResult<Teacher>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<Teacher>('Sesi admin tidak valid');
    }

    const parsed = TeacherCreateSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<Teacher>('Data akun guru belum valid', parsed.error.flatten().fieldErrors);
    }

    const rawInput = parsed.data.username.trim().toLowerCase();
    const email = rawInput.includes('@') ? rawInput : `${rawInput}@slangtech.com`;
    const username = rawInput.includes('@') ? rawInput.split('@')[0] : rawInput;

    const authUser = await createFirebaseAuthUser(email, parsed.data.password);
    const teacher = await createTeacher(authUser.uid, authUser.email, currentAdmin.email, username);
    revalidateTeachers();
    return { success: true, message: 'Akun guru berhasil dibuat', data: teacher };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menambahkan guru',
    };
  }
}

export async function updateTeacherAction(id: string, input: unknown): Promise<ActionResult<Teacher>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<Teacher>('Sesi admin tidak valid');
    }

    const parsed = TeacherSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<Teacher>('Data guru belum valid', parsed.error.flatten().fieldErrors);
    }

    const teacher = await updateTeacher(id, parsed.data);
    revalidateTeachers();
    return { success: true, message: 'Data guru berhasil diperbarui', data: teacher };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal memperbarui guru',
    };
  }
}

export async function deleteTeacherAction(id: string): Promise<ActionResult> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError('Sesi admin tidak valid');
    }

    const teacher = await getTeacherById(id);
    if (!teacher) {
      return validationError('Guru tidak ditemukan');
    }

    // 1. Hapus dokumen profil guru di Firestore terlebih dahulu
    await deleteTeacher(id);
    if (teacher.uid && teacher.uid !== id) {
      await deleteTeacher(teacher.uid);
    }

    // 2. Hapus akun di Firebase Authentication
    try {
      await deleteFirebaseAuthUser(teacher.uid || teacher.id);
    } catch (authError) {
      console.warn('Peringatan: Gagal menghapus akun Firebase Auth guru:', authError);
    }

    revalidateTeachers();
    return { success: true, message: 'Data guru di Firestore dan akun berhasil dihapus' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menghapus guru',
    };
  }
}
