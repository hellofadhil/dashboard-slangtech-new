'use server';

import { revalidatePath } from 'next/cache';
import { createFirebaseAuthUser } from '@/lib/auth/firebase-auth-rest';
import { getCurrentAdminUser } from '@/lib/auth/server';
import { AdminUserSchema } from '@/features/admins/schemas';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
} from '@/features/admins/data';
import type { AdminUser } from '@/features/admins/types';
import type { ActionResult } from '@/features/shared/types';
import { validationError } from '@/features/shared/action-utils';

export async function createAdminUserAction(input: unknown): Promise<ActionResult<AdminUser>> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError<AdminUser>('Sesi admin tidak valid');
    }

    const parsed = AdminUserSchema.safeParse(input);
    if (!parsed.success) {
      return validationError<AdminUser>('Data admin belum valid', parsed.error.flatten().fieldErrors);
    }

    const authUser = await createFirebaseAuthUser(parsed.data.email, parsed.data.password);
    const admin = await createAdminUser(authUser.email, currentAdmin.email, authUser.uid);
    revalidatePath('/dashboard/admins');
    return { success: true, message: 'Admin berhasil ditambahkan', data: admin };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menambahkan admin',
    };
  }
}

export async function deleteAdminUserAction(email: string): Promise<ActionResult> {
  try {
    const currentAdmin = await getCurrentAdminUser();
    if (!currentAdmin) {
      return validationError('Sesi admin tidak valid');
    }

    const admins = await getAdminUsers();
    const normalizedEmail = email.trim().toLowerCase();

    if (admins.length <= 1) {
      return validationError('Minimal harus ada satu admin aktif');
    }

    await deleteAdminUser(normalizedEmail);
    revalidatePath('/dashboard/admins');
    return { success: true, message: 'Admin berhasil dihapus' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menghapus admin',
    };
  }
}
