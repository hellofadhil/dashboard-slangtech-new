import { z } from 'zod';

export const TeacherCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username atau email minimal 3 karakter')
    .max(100, 'Username atau email maksimal 100 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const TeacherAddressSchema = z.object({
  street: z.string().trim(),
  provinceId: z.string().trim(),
  provinceName: z.string().trim(),
  regencyId: z.string().trim(),
  regencyName: z.string().trim(),
  districtId: z.string().trim(),
  districtName: z.string().trim(),
  villageId: z.string().trim(),
  villageName: z.string().trim(),
  fullAddress: z.string().trim(),
});

export const TeacherSchema = z.object({
  fullName: z.string().trim(),
  nickname: z.string().trim(),
  email: z.string().trim().email('Email guru tidak valid').toLowerCase(),
  phoneNumber: z.string().trim(),
  photoUrl: z.string().trim().optional(),
  headline: z.string().trim(),
  bio: z.string().trim(),
  languages: z.array(z.string().trim()).default([]),
  experienceYears: z.coerce.number().int('Pengalaman harus berupa angka bulat').min(0, 'Pengalaman tidak boleh negatif'),
  lastEducation: z.string().trim(),
  address: TeacherAddressSchema,
  status: z.enum(['active', 'inactive']),
});
