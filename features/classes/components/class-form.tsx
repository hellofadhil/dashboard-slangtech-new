'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Control, type Path } from 'react-hook-form';
import { toast } from 'sonner';
import { createClassAction, updateClassAction } from '@/features/classes/actions';
import { ImageUploader } from '@/components/dashboard/image-uploader';
import { FormattedNumberInput } from '@/components/dashboard/formatted-number-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CLASS_LEVEL_OPTIONS, CLASS_TYPE_OPTIONS } from '@/features/classes/constants';
import { zodSubmitResolver } from '@/features/shared/form-resolver';
import { ClassSchema, type ClassFormInput } from '@/features/classes/schemas';
import { Class, LocalizedText } from '@/lib/dashboard/types';
import { slugify } from '@/lib/dashboard/utils';

type LocalizedBaseName =
  | 'name'
  | 'longDescription';

function localizedText(value?: LocalizedText | null): LocalizedText {
  return {
    id: value?.id ?? '',
    en: value?.en ?? '',
    zh: value?.zh ?? '',
  };
}

function getDefaultValues(classItem?: Class): ClassFormInput {
  return {
    slug: classItem?.slug ?? '',
    name: localizedText(classItem?.name),
    type: classItem?.type ?? 'private',
    level: classItem?.level ?? '',
    price: classItem?.price ?? 0,
    discountPrice: classItem?.discountPrice ?? null,
    longDescription: localizedText(classItem?.longDescription),
    totalSessions: classItem?.totalSessions ?? 1,
    sessionDurationMinutes: classItem?.sessionDurationMinutes ?? 60,
    coverImage: classItem?.coverImage ?? '',
    images: classItem?.images ?? [],
    isActive: classItem?.isActive ?? true,
    isFeatured: classItem?.isFeatured ?? false,
  };
}

function LocalizedFieldGroup({
  control,
  baseName,
  description,
  multiline = false,
  title,
}: {
  control: Control<ClassFormInput>;
  baseName: LocalizedBaseName;
  description?: string;
  multiline?: boolean;
  title?: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      {title || description ? (
        <div>
          {title ? <p className="text-sm font-medium">{title}</p> : null}
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={control}
          name={`${baseName}.id` as Path<ClassFormInput>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indonesia</FormLabel>
              <FormControl>
                {multiline ? (
                  <Textarea {...field} value={String(field.value ?? '')} rows={4} placeholder="Teks bahasa Indonesia" />
                ) : (
                  <Input {...field} value={String(field.value ?? '')} placeholder="Teks bahasa Indonesia" />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${baseName}.en` as Path<ClassFormInput>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>English</FormLabel>
              <FormControl>
                {multiline ? (
                  <Textarea {...field} value={String(field.value ?? '')} rows={4} placeholder="English text" />
                ) : (
                  <Input {...field} value={String(field.value ?? '')} placeholder="English text" />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${baseName}.zh` as Path<ClassFormInput>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>中文</FormLabel>
              <FormControl>
                {multiline ? (
                  <Textarea {...field} value={String(field.value ?? '')} rows={4} placeholder="中文文本" />
                ) : (
                  <Input {...field} value={String(field.value ?? '')} placeholder="中文文本" />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function LocalizedDescriptionTabs({ control }: { control: Control<ClassFormInput> }) {
  return (
    <Tabs defaultValue="id" className="gap-4">
      <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg border bg-muted/40 p-1">
        <TabsTrigger value="id" className="h-11">
          Indonesia
        </TabsTrigger>
        <TabsTrigger value="en" className="h-11">
          English
        </TabsTrigger>
        <TabsTrigger value="zh" className="h-11">
          Mandarin
        </TabsTrigger>
      </TabsList>

      <TabsContent value="id" forceMount className="data-[state=inactive]:hidden">
        <FormField
          control={control}
          name="longDescription.id"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={9}
                  className="min-h-56 resize-y"
                  placeholder="Tulis deskripsi lengkap kelas dalam bahasa Indonesia"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="en" forceMount className="data-[state=inactive]:hidden">
        <FormField
          control={control}
          name="longDescription.en"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={9}
                  className="min-h-56 resize-y"
                  placeholder="Write the complete class description in English"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="zh" forceMount className="data-[state=inactive]:hidden">
        <FormField
          control={control}
          name="longDescription.zh"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={9}
                  className="min-h-56 resize-y"
                  placeholder="Tulis deskripsi lengkap kelas dalam bahasa Mandarin"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>
    </Tabs>
  );
}

interface ClassFormProps {
  classItem?: Class;
}

export function ClassForm({ classItem }: ClassFormProps) {
  const router = useRouter();
  const [imageBusy, setImageBusy] = useState({ cover: false, gallery: false });
  const form = useForm<ClassFormInput>({
    resolver: zodSubmitResolver(ClassSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: getDefaultValues(classItem),
  });
  const coverImage = form.watch('coverImage');
  const images = form.watch('images');
  const isUploadingImages = imageBusy.cover || imageBusy.gallery;
  const coverImageValue = useMemo(() => (coverImage ? [coverImage] : []), [coverImage]);
  const imageUrls = useMemo(() => images.map((image) => image.url), [images]);

  const setCoverBusy = useCallback((busy: boolean) => {
    setImageBusy((current) => current.cover === busy ? current : { ...current, cover: busy });
  }, []);

  const setGalleryBusy = useCallback((busy: boolean) => {
    setImageBusy((current) => current.gallery === busy ? current : { ...current, gallery: busy });
  }, []);

  const applyFieldErrors = (fieldErrors?: Record<string, string[]>) => {
    Object.entries(fieldErrors ?? {}).forEach(([field, messages]) => {
      if (messages[0]) {
        form.setError(field as Parameters<typeof form.setError>[0], { message: messages[0] });
      }
    });
  };

  const getDefaultImageAlt = (index: number) => {
    const englishName = form.getValues('name.en');
    const indonesianName = form.getValues('name.id');
    return `${englishName || indonesianName || 'Language class'} image ${index + 1}`;
  };

  const handleCoverChange = (urls: string[]) => {
    form.setValue('coverImage', urls[0] ?? '', {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleGalleryChange = (urls: string[]) => {
    const currentImages = form.getValues('images');
    const currentByUrl = new Map(currentImages.map((image) => [image.url, image]));
    const nextImages = urls.map((url, index) => currentByUrl.get(url) ?? {
      url,
      alt: getDefaultImageAlt(index),
    });

    form.setValue('images', nextImages, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleNameBlur = () => {
    const slug = form.getValues('slug');
    const englishName = form.getValues('name.en');
    const indonesianName = form.getValues('name.id');

    if (!slug && (englishName || indonesianName)) {
      form.setValue('slug', slugify(englishName || indonesianName), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const handleSubmit = async (data: ClassFormInput) => {
    if (isUploadingImages) {
      toast.error('Tunggu sampai upload gambar selesai');
      return;
    }

    const result = classItem
      ? await updateClassAction(classItem.id, data)
      : await createClassAction(data);

    if (!result.success) {
      applyFieldErrors(result.fieldErrors);
      toast.error(result.message || 'Gagal menyimpan data kelas');
      return;
    }

    toast.success(result.message);
    router.push('/dashboard/classes');
    router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
            <CardDescription>Nama kelas, slug, tipe program, dan level pembelajaran.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div onBlur={handleNameBlur}>
              <LocalizedFieldGroup
                control={form.control}
                baseName="name"
                title="Nama Kelas"
                description="Nama akan tampil pada halaman kelas dalam tiga bahasa."
              />
            </div>

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="private-beginner" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Kelas</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full px-4 text-base md:text-base">
                          <SelectValue placeholder="Pilih tipe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLASS_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full px-4 text-base md:text-base">
                          <SelectValue placeholder="Pilih level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLASS_LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Harga</CardTitle>
            <CardDescription>Harga reguler dan harga promo jika tersedia.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga</FormLabel>
                  <FormControl>
                    <FormattedNumberInput
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? 0)}
                      onBlur={field.onBlur}
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discountPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga Diskon</FormLabel>
                  <FormControl>
                    <FormattedNumberInput
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Kosongkan jika tidak ada diskon"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deskripsi Lengkap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <LocalizedDescriptionTabs control={form.control} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Kelas</CardTitle>
            <CardDescription>Durasi dan status kurasi dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="totalSessions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Sesi</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value)}
                      placeholder="12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionDurationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durasi Sesi</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value)}
                      placeholder="60"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Dalam menit.</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-lg border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel className="!mt-0">Aktif</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-lg border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel className="!mt-0">Featured</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gambar Kelas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="coverImage"
              render={() => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <ImageUploader
                    value={coverImageValue}
                    onChange={handleCoverChange}
                    folder="classes"
                    label="Upload Cover"
                    onBusyChange={setCoverBusy}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Additional Images</FormLabel>
              <ImageUploader
                value={imageUrls}
                onChange={handleGalleryChange}
                folder="classes"
                label="Tambah Gambar"
                multiple
                onBusyChange={setGalleryBusy}
              />
              {images.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {images.map((image, index) => (
                    <FormField
                      key={image.url}
                      control={form.control}
                      name={`images.${index}.alt`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alt Text Gambar {index + 1}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Deskripsi gambar untuk aksesibilitas" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada gambar tambahan.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/classes')}>
            Batal
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || isUploadingImages}>
            {form.formState.isSubmitting
              ? 'Menyimpan...'
              : isUploadingImages
                ? 'Menunggu Upload...'
                : classItem
                  ? 'Simpan'
                  : 'Tambah Kelas'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
