import { UploadFolder } from '@/lib/dashboard/types';

export interface R2UploadOptions {
  file: File;
  folder: UploadFolder;
}

export interface R2UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export async function uploadToR2({ file, folder }: R2UploadOptions): Promise<R2UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json() as R2UploadResult;

    if (!response.ok) {
      return { success: false, error: data.error || 'Gagal mengunggah gambar' };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengunggah gambar',
    };
  }
}

export async function deleteFromR2(imageUrl: string): Promise<R2UploadResult> {
  try {
    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl }),
    });
    const data = await response.json() as R2UploadResult;

    if (!response.ok) {
      return { success: false, error: data.error || 'Gagal menghapus gambar' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menghapus gambar',
    };
  }
}
