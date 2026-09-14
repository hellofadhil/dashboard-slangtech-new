import { z } from 'zod';

const emptyStringToNull = (value: unknown) => value === '' || value === undefined ? null : value;

const nullableNumberSchema = z.preprocess(
  emptyStringToNull,
  z.coerce.number().min(0, 'Nilai tidak boleh negatif').nullable(),
);

const requiredNumberSchema = z.coerce
  .number()
  .min(0, 'Nilai tidak boleh negatif');

const LocalizedTextSchema = z.object({
  id: z.string().trim().min(1, 'Teks Indonesia wajib diisi').max(2000, 'Teks Indonesia maksimal 2000 karakter'),
  en: z.string().trim().min(1, 'Teks Inggris wajib diisi').max(2000, 'Teks Inggris maksimal 2000 karakter'),
  zh: z.string().trim().min(1, 'Teks Mandarin wajib diisi').max(2000, 'Teks Mandarin maksimal 2000 karakter'),
});

const ClassImageSchema = z.object({
  url: z.string().trim().url('URL gambar tidak valid'),
  alt: z.string().trim().min(1, 'Alt text gambar wajib diisi').max(180, 'Alt text maksimal 180 karakter'),
});

export const ClassSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, 'Slug wajib diisi')
      .max(200, 'Slug maksimal 200 karakter')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung'),
    name: LocalizedTextSchema,
    type: z.enum(['private', 'group'], 'Tipe kelas tidak valid'),
    level: z.string().trim().min(1, 'Level wajib diisi').max(120, 'Level maksimal 120 karakter'),
    price: requiredNumberSchema,
    discountPrice: nullableNumberSchema,
    longDescription: LocalizedTextSchema,
    totalSessions: z.coerce
      .number()
      .int('Total sesi harus berupa angka bulat')
      .min(1, 'Total sesi harus lebih dari 0'),
    sessionDurationMinutes: z.coerce
      .number()
      .int('Durasi sesi harus berupa angka bulat')
      .min(1, 'Durasi sesi harus lebih dari 0'),
    coverImage: z.string().trim().url('Cover image wajib diunggah'),
    images: z.array(ClassImageSchema).default([]),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  })
  .superRefine((classItem, ctx) => {
    if (classItem.discountPrice !== null && classItem.discountPrice > classItem.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountPrice'],
        message: 'Harga diskon tidak boleh lebih besar dari harga',
      });
    }
  });

export type ClassFormInput = z.infer<typeof ClassSchema>;
