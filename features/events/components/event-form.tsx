'use client';

import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Control, type Path } from 'react-hook-form';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createEventAction, updateEventAction } from '@/features/events/actions';
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
import { zodSubmitResolver } from '@/features/shared/form-resolver';
import { EventSchema, type EventFormInput } from '@/features/events/schemas';
import { Event, EventSession, LocalizedText } from '@/lib/dashboard/types';
import { slugify } from '@/lib/dashboard/utils';

type LocalizedBaseName = 'name' | 'longDescription';

function localizedText(value?: LocalizedText | null): LocalizedText {
  return {
    id: value?.id ?? '',
    en: value?.en ?? '',
    zh: value?.zh ?? '',
  };
}

function toDatetimeLocal(value?: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createSessionId(): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36);

  return `session-${suffix}`;
}

function createDefaultSession(index = 0, startsAt = ''): EventSession {
  const sessionNumber = index + 1;

  return {
    id: createSessionId(),
    sessionNumber,
    title: `Session ${sessionNumber}`,
    startsAt,
    timezone: 'Asia/Jakarta',
    notes: '',
  };
}

function getDefaultSessions(eventItem?: Event): EventSession[] {
  if (eventItem?.sessions.length) {
    return eventItem.sessions.map((session, index) => ({
      ...session,
      sessionNumber: index + 1,
      startsAt: toDatetimeLocal(session.startsAt),
    }));
  }

  return [createDefaultSession(0, toDatetimeLocal(eventItem?.startsAt))];
}

function createTrainerId(name: string): string {
  const slug = slugify(name) || 'trainer';
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36);

  return `${slug}-${suffix}`;
}

function getDefaultValues(eventItem?: Event): EventFormInput {
  return {
    slug: eventItem?.slug ?? '',
    name: localizedText(eventItem?.name),
    longDescription: localizedText(eventItem?.longDescription),
    priceType: eventItem?.priceType ?? 'free',
    price: eventItem?.price ?? 0,
    sessions: getDefaultSessions(eventItem),
    timezone: eventItem?.timezone ?? 'Asia/Jakarta',
    trainers: eventItem?.trainers ?? [],
    contact: {
      name: eventItem?.contact.name ?? '',
      whatsappNumber: eventItem?.contact.whatsappNumber ?? '',
    },
    coverImage: eventItem?.coverImage ?? '',
    images: eventItem?.images ?? [],
    isActive: eventItem?.isActive ?? true,
    isFeatured: eventItem?.isFeatured ?? false,
  };
}

function LocalizedFieldGroup({
  control,
  baseName,
  description,
  multiline = false,
  title,
}: {
  control: Control<EventFormInput>;
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
          name={`${baseName}.id` as Path<EventFormInput>}
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
          name={`${baseName}.en` as Path<EventFormInput>}
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
          name={`${baseName}.zh` as Path<EventFormInput>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mandarin</FormLabel>
              <FormControl>
                {multiline ? (
                  <Textarea {...field} value={String(field.value ?? '')} rows={4} placeholder="Teks bahasa Mandarin" />
                ) : (
                  <Input {...field} value={String(field.value ?? '')} placeholder="Teks bahasa Mandarin" />
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

function LocalizedDescriptionTabs({ control }: { control: Control<EventFormInput> }) {
  const descriptionFields = [
    { locale: 'id', name: 'longDescription.id' },
    { locale: 'en', name: 'longDescription.en' },
    { locale: 'zh', name: 'longDescription.zh' },
  ] as const;

  return (
    <Tabs defaultValue="id" className="gap-4">
      <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg border bg-muted/40 p-1">
        <TabsTrigger value="id" className="h-11">Indonesia</TabsTrigger>
        <TabsTrigger value="en" className="h-11">English</TabsTrigger>
        <TabsTrigger value="zh" className="h-11">Mandarin</TabsTrigger>
      </TabsList>

      {descriptionFields.map((item) => (
        <TabsContent key={item.locale} value={item.locale} forceMount className="data-[state=inactive]:hidden">
          <FormField
            control={control}
            name={item.name}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    value={String(field.value ?? '')}
                    rows={9}
                    className="min-h-56 resize-y"
                    placeholder="Tulis deskripsi lengkap event"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface EventFormProps {
  eventItem?: Event;
}

export function EventForm({ eventItem }: EventFormProps) {
  const router = useRouter();
  const [imageBusy, setImageBusy] = useState({ cover: false, gallery: false });
  const [trainerDraft, setTrainerDraft] = useState('');
  const form = useForm<EventFormInput>({
    resolver: zodSubmitResolver(EventSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: getDefaultValues(eventItem),
  });
  const coverImage = form.watch('coverImage');
  const images = form.watch('images');
  const priceType = form.watch('priceType');
  const trainers = form.watch('trainers');
  const sessions = form.watch('sessions');
  const isUploadingImages = imageBusy.cover || imageBusy.gallery;
  const coverImageValue = useMemo(() => (coverImage ? [coverImage] : []), [coverImage]);
  const imageUrls = useMemo(() => images.map((image) => image.url), [images]);

  useEffect(() => {
    if (priceType === 'free' && form.getValues('price') !== 0) {
      form.setValue('price', 0, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, priceType]);

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
    return `${englishName || indonesianName || 'Event'} image ${index + 1}`;
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

  const addTrainer = () => {
    const name = trainerDraft.trim();
    if (!name) {
      return;
    }

    const currentTrainers = form.getValues('trainers');
    if (currentTrainers.some((trainer) => trainer.name.toLowerCase() === name.toLowerCase())) {
      setTrainerDraft('');
      return;
    }

    form.setValue('trainers', [...currentTrainers, { id: createTrainerId(name), name }], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setTrainerDraft('');
  };

  const handleTrainerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }

    event.preventDefault();
    addTrainer();
  };

  const removeTrainer = (trainerId: string) => {
    form.setValue('trainers', form.getValues('trainers').filter((trainer) => trainer.id !== trainerId), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const addSession = () => {
    const currentSessions = form.getValues('sessions');
    form.setValue('sessions', [...currentSessions, createDefaultSession(currentSessions.length)], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeSession = (sessionId: string) => {
    const nextSessions = form.getValues('sessions')
      .filter((session) => session.id !== sessionId)
      .map((session, index) => ({
        ...session,
        sessionNumber: index + 1,
        title: session.title || `Session ${index + 1}`,
      }));

    form.setValue('sessions', nextSessions.length ? nextSessions : [createDefaultSession()], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = async (data: EventFormInput) => {
    if (isUploadingImages) {
      toast.error('Tunggu sampai upload gambar selesai');
      return;
    }

    const result = eventItem
      ? await updateEventAction(eventItem.id, data)
      : await createEventAction(data);

    if (!result.success) {
      applyFieldErrors(result.fieldErrors);
      toast.error(result.message || 'Gagal menyimpan data event');
      return;
    }

    toast.success(result.message);
    router.push('/dashboard/events');
    router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Event</CardTitle>
            <CardDescription>Nama event, slug, dan deskripsi lengkap dalam tiga bahasa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div onBlur={handleNameBlur}>
              <LocalizedFieldGroup
                control={form.control}
                baseName="name"
                title="Nama Event"
                description="Nama event akan dipakai pada listing, detail, dan snapshot enrollment event."
              />
            </div>

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mandarin-workshop-intro" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LocalizedDescriptionTabs control={form.control} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Harga</CardTitle>
            <CardDescription>Peserta event gratis dapat langsung terdaftar tanpa verifikasi pembayaran.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="priceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Harga</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full px-4 text-base md:text-base">
                        <SelectValue placeholder="Pilih tipe harga" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Berbayar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder={priceType === 'free' ? '0' : '150.000'}
                      disabled={priceType === 'free'}
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
            <CardTitle>Jadwal Sesi Event</CardTitle>
            <CardDescription>Tambahkan sesi event secara manual. Sesi pertama dipakai sebagai tanggal mulai event.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <div className="min-w-[760px] divide-y">
                <div className="grid grid-cols-[80px_minmax(180px,1fr)_220px_minmax(180px,1fr)_72px] gap-3 bg-muted/40 px-4 py-3 text-sm font-medium">
                  <div>Sesi</div>
                  <div>Judul</div>
                  <div>Mulai</div>
                  <div>Catatan</div>
                  <div className="text-right">Aksi</div>
                </div>
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="grid grid-cols-[80px_minmax(180px,1fr)_220px_minmax(180px,1fr)_72px] gap-3 px-4 py-3"
                  >
                    <div className="flex h-10 items-center text-sm font-medium">#{index + 1}</div>
                    <FormField
                      control={form.control}
                      name={`sessions.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder={`Session ${index + 1}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`sessions.${index}.startsAt`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="datetime-local" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`sessions.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="Opsional" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeSession(session.id)}
                        aria-label={`Hapus sesi ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={addSession}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Sesi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trainer / Pemateri</CardTitle>
            <CardDescription>Tambahkan satu atau lebih nama pemateri atau trainer untuk event ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="trainers"
              render={() => (
                <FormItem>
                  <FormLabel>Nama Trainer</FormLabel>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                    {trainers.map((trainer) => (
                      <span
                        key={trainer.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
                      >
                        <span className="truncate">{trainer.name}</span>
                        <button
                          type="button"
                          className="rounded-full text-muted-foreground hover:text-foreground"
                          onClick={() => removeTrainer(trainer.id)}
                          aria-label={`Hapus trainer ${trainer.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    <Input
                      value={trainerDraft}
                      onChange={(event) => setTrainerDraft(event.target.value)}
                      onKeyDown={handleTrainerKeyDown}
                      className="h-9 min-w-44 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
                      placeholder={trainers.length ? 'Tambah trainer' : 'Ketik nama trainer lalu Enter'}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addTrainer}>
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Narahubung</CardTitle>
            <CardDescription>Kontak utama untuk pertanyaan peserta dan koordinasi event.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contact.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl><Input {...field} placeholder="Admin SlangTech" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact.whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl><Input {...field} placeholder="+62..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Event</CardTitle>
            <CardDescription>Atur status publikasi dan ketersediaan pendaftaran event.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
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
            <CardTitle>Gambar Event</CardTitle>
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
                    folder="events"
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
                folder="events"
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
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/events')}>
            Batal
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || isUploadingImages}>
            {form.formState.isSubmitting
              ? 'Menyimpan...'
              : isUploadingImages
                ? 'Menunggu Upload...'
                : eventItem
                  ? 'Simpan'
                  : 'Tambah Event'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
