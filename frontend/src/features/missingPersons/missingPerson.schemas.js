import { z } from 'zod';

export const missingPersonSchema = z.object({
  fullName: z.string().min(2, 'Enter the full name of the missing person'),
  age: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (v >= 0 && v <= 130), 'Enter a realistic age'),
  gender: z.enum(['male', 'female', 'other', 'unknown']).default('unknown'),
  height: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  clothingDescription: z.string().optional(),
  descriptionText: z.string().min(10, 'Add a short description (at least 10 characters)'),
  identifyingMarksText: z.string().optional(),
  lastKnownAddress: z.string().optional(),
  // Set behind the scenes by the Leaflet location picker (current
  // location, typed place search, or a dragged pin) — not typed directly.
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  lastSeenAt: z.string().optional(),
  photoUrl: z.string().url('Enter a valid image URL').optional().or(z.literal('')),
});