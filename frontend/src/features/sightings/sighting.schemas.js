import { z } from 'zod';

export const sightingSchema = z.object({
  description: z.string().min(10, 'Add a short description (at least 10 characters)'),
  locationAddress: z.string().optional(),
  // Set behind the scenes by the Leaflet location picker (current
  // location, typed place search, or a dragged pin) — not typed directly.
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sightedAt: z.string().optional(),
  photoUrl: z.string().url('Enter a valid image URL').optional().or(z.literal('')),
  isAnonymous: z.boolean().optional().default(false),
});