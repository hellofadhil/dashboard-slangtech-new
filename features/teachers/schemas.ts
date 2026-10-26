import { z } from 'zod';

export const TeacherCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .max(100, 'Username maksimal 100 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  email: z.string().trim().email('Format email belum valid').toLowerCase(),
  fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi'),
  nickname: z.string().trim().min(1, 'Nama panggilan wajib diisi'),
  phoneCountryCode: z.string().trim().default('+62'),
  phoneNationalNumber: z.string().trim().min(5, 'Nomor telepon minimal 5 digit'),
  phoneNumber: z.string().trim().optional(),
  birthDate: z.string().trim().min(1, 'Tanggal lahir wajib diisi'),
  birthPlace: z.string().trim().min(1, 'Tempat lahir wajib diisi'),
  lastEducation: z.string().trim().min(1, 'Pendidikan terakhir wajib diisi'),
  headline: z.string().trim().optional().default(''),
  bio: z.string().trim().optional().default(''),
  experienceYears: z.coerce.number().int().min(0, 'Pengalaman tidak boleh negatif').default(0),
  // KTP Address
  ktpStreet: z.string().trim().min(1, 'Jalan alamat KTP wajib diisi'),
  ktpProvinceId: z.string().trim().min(1, 'Provinsi KTP wajib dipilih'),
  ktpProvinceName: z.string().trim().min(1, 'Provinsi KTP wajib dipilih'),
  ktpRegencyId: z.string().trim().min(1, 'Kabupaten/Kota KTP wajib dipilih'),
  ktpRegencyName: z.string().trim().min(1, 'Kabupaten/Kota KTP wajib dipilih'),
  ktpDistrictId: z.string().trim().min(1, 'Kecamatan KTP wajib dipilih'),
  ktpDistrictName: z.string().trim().min(1, 'Kecamatan KTP wajib dipilih'),
  ktpVillageId: z.string().trim().min(1, 'Desa/Kelurahan KTP wajib dipilih'),
  ktpVillageName: z.string().trim().min(1, 'Desa/Kelurahan KTP wajib dipilih'),
  // Domicile Address
  domicileSameAsKtp: z.boolean().default(false),
  domicileStreet: z.string().trim().optional().default(''),
  domicileProvinceId: z.string().trim().optional().default(''),
  domicileProvinceName: z.string().trim().optional().default(''),
  domicileRegencyId: z.string().trim().optional().default(''),
  domicileRegencyName: z.string().trim().optional().default(''),
  domicileDistrictId: z.string().trim().optional().default(''),
  domicileDistrictName: z.string().trim().optional().default(''),
  domicileVillageId: z.string().trim().optional().default(''),
  domicileVillageName: z.string().trim().optional().default(''),
}).refine(
  (data) => {
    if (data.domicileSameAsKtp) {
      return true;
    }
    return Boolean(
      data.domicileStreet &&
      data.domicileProvinceId &&
      data.domicileRegencyId &&
      data.domicileDistrictId &&
      data.domicileVillageId
    );
  },
  {
    message: 'Alamat domisili harus dilengkapi jika tidak sama dengan KTP',
    path: ['domicileStreet'],
  }
);

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
