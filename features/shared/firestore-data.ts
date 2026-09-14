import type { LocalizedText } from '@/features/shared/types';

export type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

export function nowIso(): string {
  return new Date().toISOString();
}

export function removeUndefined(value: unknown): FirestoreValue {
  if (value === undefined) {
    return null;
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, FirestoreValue>>(
      (clean, [key, entry]) => {
        if (entry !== undefined) {
          clean[key] = removeUndefined(entry);
        }
        return clean;
      },
      {},
    );
  }

  return null;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asDateValue(value: unknown): Date | unknown {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return value;
}

export function normalizeLocalizedText(value: unknown): LocalizedText {
  const data = asRecord(value);

  return {
    id: asString(data.id, typeof value === 'string' ? value : ''),
    en: asString(data.en),
    zh: asString(data.zh),
  };
}

export function toIsoString(value: unknown, fallback = ''): string {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return fallback;
}

export function getTime(value: unknown): number {
  const date = new Date(toIsoString(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
