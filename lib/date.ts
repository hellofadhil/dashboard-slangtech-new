function getTimestampDate(value: object): Date | null {
  if (
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  return null;
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object' && value !== null) {
    return getTimestampDate(value);
  }

  return null;
}

export function isToday(value: unknown): boolean {
  const date = toDate(value);
  const today = new Date();

  return Boolean(
    date &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate(),
  );
}

export function isThisMonth(value: unknown): boolean {
  const date = toDate(value);
  const today = new Date();

  return Boolean(
    date &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth(),
  );
}

export function isThisWeek(value: unknown): boolean {
  const date = toDate(value);
  if (!date) {
    return false;
  }

  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return date >= start && date < end;
}

export function formatCurrencyIDR(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount).replace(/\u00a0/g, ' ');
}
