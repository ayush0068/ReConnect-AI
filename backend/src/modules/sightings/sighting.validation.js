import { z } from 'zod';

export const createSightingSchema = z.object({
  description: z.string().min(10, 'Add a short description (at least 10 characters)'),
  photos: z.array(z.string().url('Each photo must be a valid URL')).optional().default([]),
  locationAddress: z.string().optional(),
  // Set by the Leaflet location picker on the frontend — current
  // location, typed place name (geocoded), or a dragged pin.
  latitude: z.coerce.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude').optional(),
  longitude: z.coerce.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude').optional(),
  sightedAt: z.coerce.date().optional(),
  relatedMissingPersonId: z.string().optional(),
  // Lets a signed-in citizen still choose to report without attaching
  // their identity, per "Report a sighting — anonymously, if you prefer."
  isAnonymous: z.coerce.boolean().optional().default(false),
});