import { z } from 'zod';

const requiredNumberSchema = z.coerce
  .number()
  .min(0, 'Nilai tidak boleh negatif');

const LocalizedTextSchema = z.object({
  id: z.string().trim().min(1, 'Teks Indonesia wajib diisi').max(2000, 'Teks Indonesia maksimal 2000 karakter'),
  en: z.string().trim().min(1, 'Teks Inggris wajib diisi').max(2000, 'Teks Inggris maksimal 2000 karakter'),
  zh: z.string().trim().min(1, 'Teks Mandarin wajib diisi').max(2000, 'Teks Mandarin maksimal 2000 karakter'),
});

const EventImageSchema = z.object({
  url: z.string().trim().url('URL gambar tidak valid'),
  alt: z.string().trim().min(1, 'Alt text gambar wajib diisi').max(180, 'Alt text maksimal 180 karakter'),
});

const isoDateTimeSchema = z.string()
  .trim()
  .min(1, 'Tanggal dan waktu mulai wajib diisi')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Tanggal dan waktu mulai tidak valid');

const EventTrainerSchema = z.object({
  id: z.string().trim().min(1, 'ID trainer wajib diisi'),
  name: z.string().trim().min(1, 'Nama trainer wajib diisi').max(120, 'Nama trainer maksimal 120 karakter'),
});

const EventContactSchema = z.object({
  name: z.string().trim().min(1, 'Nama narahubung wajib diisi').max(120, 'Nama narahubung maksimal 120 karakter'),
  whatsappNumber: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi').max(40, 'Nomor WhatsApp maksimal 40 karakter'),
});

const EventSessionSchema = z.object({
  id: z.string().trim().min(1, 'ID sesi wajib diisi'),
  sessionNumber: z.coerce.number().int('Nomor sesi harus berupa angka bulat').min(1, 'Nomor sesi tidak valid'),
  title: z.string().trim().min(1, 'Judul sesi wajib diisi').max(120, 'Judul sesi maksimal 120 karakter'),
  startsAt: isoDateTimeSchema,
  timezone: z.string().trim().min(1, 'Timezone wajib diisi').default('Asia/Jakarta'),
  notes: z.string().trim().max(1000, 'Catatan sesi maksimal 1000 karakter').default(''),
});

export const EventSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Slug wajib diisi')
      .max(200, 'Slug maksimal 200 karakter')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung'),
    name: LocalizedTextSchema,
    longDescription: LocalizedTextSchema,
    priceType: z.enum(['free', 'paid'], 'Tipe harga tidak valid'),
    price: requiredNumberSchema,
    sessions: z.array(EventSessionSchema).min(1, 'Minimal harus ada satu sesi'),
    timezone: z.string().trim().min(1, 'Timezone wajib diisi').default('Asia/Jakarta'),
    trainers: z.array(EventTrainerSchema).min(1, 'Minimal harus ada satu trainer'),
    contact: EventContactSchema,
    coverImage: z.string().trim().url('Cover image wajib diunggah'),
    images: z.array(EventImageSchema).default([]),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  })
  .superRefine((eventItem, ctx) => {
    if (eventItem.priceType === 'free' && eventItem.price !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price'],
        message: 'Harga event gratis harus 0',
      });
    }

    if (eventItem.priceType === 'paid' && eventItem.price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price'],
        message: 'Harga event berbayar harus lebih dari 0',
      });
    }
  });

export type EventFormInput = z.infer<typeof EventSchema>;
