import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(8, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // No role field here on purpose. Reporting a missing person and
  // reporting a sighting are two features of the same account, not two
  // identities chosen at signup — every public self-registration becomes
  // a 'family' role (see auth.service.js), which now carries both
  // case:create and sighting:create permissions. Organization accounts
  // (police/hospital/ngo/shelter) are a deliberately separate flow —
  // see the note in auth.service.js — not something a public form should
  // ever be able to grant.
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});