import 'server-only';

import { revalidatePath } from 'next/cache';
import type { ActionResult, LocalizedText } from '@/features/shared/types';

export function validationError<T = undefined>(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return {
    success: false,
    message,
    fieldErrors,
  };
}

export function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (message && !message.toLowerCase().includes('undefined undefined')) {
      return message;
    }
  }

  return fallback;
}

function normalizeMultilineText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeLocalizedText(input: LocalizedText): LocalizedText {
  return {
    id: normalizeMultilineText(input.id),
    en: normalizeMultilineText(input.en),
    zh: normalizeMultilineText(input.zh),
  };
}

export function normalizeJakartaDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }

  return new Date(`${trimmed}:00+07:00`).toISOString();
}

export function getRemovedUrls(previousUrls: string[], nextUrls: string[]): string[] {
  const nextSet = new Set(nextUrls);
  return previousUrls.filter((url) => !nextSet.has(url));
}

export function revalidateDashboard(): void {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/classes');
  revalidatePath('/dashboard/events');
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/event-enrollments');
}

export function revalidateEnrollmentPaths(enrollmentId: string): void {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/enrollments');
  revalidatePath(`/dashboard/enrollments/${enrollmentId}`);
}
