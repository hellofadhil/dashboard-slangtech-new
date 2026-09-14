import { z } from 'zod';

export const AdminUserSchema = z.object({
  email: z.string().trim().email('Email admin tidak valid').toLowerCase(),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});
