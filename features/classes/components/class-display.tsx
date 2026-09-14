import { Class } from '@/lib/dashboard/types';
import { formatRupiah } from '@/lib/dashboard/utils';

export function ClassPriceDisplay({ classItem }: { classItem: Class }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="truncate font-semibold" title={formatRupiah(classItem.discountPrice ?? classItem.price)}>
        {formatRupiah(classItem.discountPrice ?? classItem.price)}
      </p>
      {classItem.discountPrice !== null && classItem.discountPrice !== undefined ? (
        <p className="truncate text-sm text-muted-foreground line-through" title={formatRupiah(classItem.price)}>
          {formatRupiah(classItem.price)}
        </p>
      ) : null}
    </div>
  );
}

export function ClassImagePreview({ classItem }: { classItem: Class }) {
  if (!classItem.coverImage) {
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
        title="Tanpa Cover"
      >
        -
      </div>
    );
  }

  return (
    <img
      src={classItem.coverImage}
      alt={classItem.name.en || classItem.name.id}
      className="h-14 w-14 shrink-0 rounded-md border object-cover"
    />
  );
}
