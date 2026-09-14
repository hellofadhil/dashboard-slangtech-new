'use client';

import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type FormattedNumberInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'value' | 'onChange'
> & {
  value: number | string | null | undefined;
  onValueChange: (value: number | null) => void;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const digits = onlyDigits(String(value));
  if (!digits) {
    return '';
  }

  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export function FormattedNumberInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: FormattedNumberInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={formatNumber(value)}
      onChange={(event) => {
        const digits = onlyDigits(event.target.value);
        onValueChange(digits ? Number(digits) : null);
      }}
      onBlur={onBlur}
    />
  );
}
