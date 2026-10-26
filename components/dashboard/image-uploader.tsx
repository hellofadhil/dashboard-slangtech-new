'use client';

import { ChangeEvent, useEffect, useRef, useState, useTransition } from 'react';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UploadFolder } from '@/lib/dashboard/types';
import { deleteImageAction, uploadImageAction } from '@/features/media/actions';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: UploadFolder;
  label: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  onBusyChange?: (busy: boolean) => void;
}

interface SortableImageCardProps {
  url: string;
  index: number;
  disabled: boolean;
  onRemove: (url: string) => void;
}

function SortableImageCard({ url, index, disabled, onRemove }: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: url,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-muted',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <img
        src={url}
        alt={`Preview gambar ${index + 1}`}
        className="h-40 w-full object-cover"
      />
      {index === 0 ? (
        <div className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
          Cover
        </div>
      ) : null}
      <button
        type="button"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        aria-label={`Pindahkan gambar ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/60 p-2">
        <span className="truncate text-xs text-white">Gambar {index + 1}</span>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-8 w-8 shrink-0"
          onClick={() => onRemove(url)}
          disabled={disabled}
          aria-label={`Hapus gambar ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ImageUploader({
  value,
  onChange,
  folder,
  label,
  multiple = false,
  disabled = false,
  className,
  onBusyChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [slotCount, setSlotCount] = useState(() => (multiple ? Math.max(1, value.length + 1) : 0));
  const emptySlotCount = multiple ? Math.max(1, slotCount - value.length) : 0;
  const isBusy = disabled || uploading || isPending;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (multiple) {
      setSlotCount((current) => Math.max(current, value.length + 1));
    }
  }, [multiple, value.length]);

  useEffect(() => {
    onBusyChange?.(uploading || isPending);
  }, [uploading, isPending, onBusyChange]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const result = await uploadImageAction(formData);
      if (!result.success || !result.data) {
        toast.error(result.message || 'Gagal mengunggah gambar');
        continue;
      }

      uploadedUrls.push(result.data.url);
    }

    if (uploadedUrls.length) {
      const nextValue = multiple ? [...value, ...uploadedUrls] : [uploadedUrls[uploadedUrls.length - 1]];
      const replacedUrls = multiple ? [] : value.filter((url) => !nextValue.includes(url));
      onChange(nextValue);
      if (multiple) {
        setSlotCount((current) => Math.max(current, nextValue.length + 1));
      }
      await Promise.all(replacedUrls.map((url) => deleteImageAction(url)));
      toast.success(uploadedUrls.length > 1 ? `${uploadedUrls.length} gambar berhasil diunggah` : 'Gambar berhasil diunggah');
    }

    setUploading(false);
    event.target.value = '';
  };

  const handleRemove = (url: string) => {
    startTransition(async () => {
      const result = await deleteImageAction(url);
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success('Gambar berhasil dihapus');
        onChange(value.filter((item) => item !== url));
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = value.indexOf(String(active.id));
    const newIndex = value.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onChange(arrayMove(value, oldIndex, newIndex));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
        disabled={isBusy}
      />
      {multiple ? (
        <>
          {value.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {value.length} gambar dipilih. Geser gambar untuk mengatur urutan tampilan. Gambar pertama otomatis menjadi sampul utama.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={value} strategy={rectSortingStrategy}>
                {value.map((url, index) => (
                  <SortableImageCard
                    key={url}
                    url={url}
                    index={index}
                    disabled={isBusy}
                    onRemove={handleRemove}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {Array.from({ length: emptySlotCount }, (_, index) => (
              <button
                key={`empty-${value.length + index}`}
                type="button"
                className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                onClick={openFilePicker}
                disabled={isBusy}
                aria-label={`Tambah gambar mulai dari slot ${value.length + index + 1}`}
              >
                {uploading ? (
                  <UploadCloud className="h-5 w-5 animate-pulse" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                <span>{uploading ? 'Mengunggah...' : `Gambar ${value.length + index + 1}`}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {multiple ? 'Pilih satu/banyak file' : 'Opsional'}
                </span>
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSlotCount((current) => current + 1)}
            disabled={isBusy}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            Tambah Slot Gambar
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={openFilePicker}
            disabled={isBusy}
          >
            {uploading ? (
              <UploadCloud className="mr-2 h-4 w-4 animate-pulse" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {uploading ? 'Mengunggah...' : label}
          </Button>

          {value.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {value.map((url, index) => (
                <div key={url} className="group relative overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={url}
                    alt="Preview gambar"
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/60 p-2">
                    <span className="truncate text-xs text-white">Gambar {index + 1}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemove(url)}
                      disabled={isBusy}
                      aria-label="Hapus Gambar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada gambar yang diunggah.</p>
          )}
        </>
      )}
    </div>
  );
}
