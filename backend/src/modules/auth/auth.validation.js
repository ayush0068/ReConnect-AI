import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(8, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Only family/citizen self-serve through this endpoint.
  // Org accounts (police/hospital/ngo/shelter) go through /auth/register/organization
  // per the API Specification, since they require admin verification before activation.
  role: z.enum(['family', 'citizen']).default('family'),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});