'use server';

import { deleteFileFromR2, uploadFileToR2 } from '@/lib/r2/server';
import type { ActionResult } from '@/features/shared/types';

export async function uploadImageAction(formData: FormData): Promise<ActionResult<{ url: string; key: string }>> {
  try {
    const file = formData.get('file');
    const folder = formData.get('folder');

    if (!(file instanceof File)) {
      return { success: false, message: 'File gambar wajib dipilih' };
    }

    const result = await uploadFileToR2(file, typeof folder === 'string' ? folder : 'classes');
    return { success: true, message: 'Gambar berhasil diunggah', data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal mengunggah gambar',
    };
  }
}

export async function deleteImageAction(url: string): Promise<ActionResult> {
  try {
    await deleteFileFromR2(url);
    return { success: true, message: 'Gambar berhasil dihapus' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menghapus gambar',
    };
  }
}
