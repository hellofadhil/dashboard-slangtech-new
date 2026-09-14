import { logServerError } from '@/lib/audit';
import { Class, ClassEnrollment, Event, EventEnrollment, Student, Teacher } from '@/lib/dashboard/types';

export interface SafeData<T> {
  data: T;
  error: string | null;
}

function getReadableError(error: unknown): string {
  if (error instanceof Error && error.message) {
    const message = error.message.trim();

    if (message.toLowerCase().includes('offline')) {
      return 'Tidak dapat terhubung ke Firestore. Periksa koneksi internet atau konfigurasi Firebase.';
    }

    if (!message || message.toLowerCase().includes('undefined undefined')) {
      return 'Gagal memuat data dari Firestore.';
    }

    return message;
  }

  return 'Gagal memuat data dari Firestore.';
}

export async function safelyLoad<T>(
  loader: () => Promise<T>,
  fallback: T,
): Promise<SafeData<T>> {
  try {
    return {
      data: await loader(),
      error: null,
    };
  } catch (error) {
    logServerError('dashboard.data.load', error);
    return {
      data: fallback,
      error: getReadableError(error),
    };
  }
}

export const emptyClasses: Class[] = [];

export const emptyEvents: Event[] = [];

export const emptyStudents: Student[] = [];

export const emptyTeachers: Teacher[] = [];

export const emptyEnrollments: ClassEnrollment[] = [];

export const emptyEventEnrollments: EventEnrollment[] = [];
