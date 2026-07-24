import mongoose from 'mongoose';

const sightingSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isAnonymous: { type: Boolean, default: false },
    relatedMissingPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MissingPerson',
      default: null,
    },
    description: { type: String, required: true, trim: true },
    photos: [{ type: String, trim: true }], // image URLs; Cloudinary upload wiring lands with the media module
    location: {
      address: { type: String, trim: true },
      // [longitude, latitude] — legacy coordinate pair format. 2dsphere
      // indexes accept this alongside full GeoJSON, so we keep the shape
      // simple while still getting geospatial query support (per the
      // Database Design doc's `location: '2dsphere'` index).
      coordinates: { type: [Number], default: undefined },
    },
    sightedAt: { type: Date, default: Date.now },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'false_report'],
      default: 'unverified',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

sightingSchema.index({ relatedMissingPersonId: 1 });
sightingSchema.index({ createdAt: -1 });
// Powers "nearby sightings" / map views (police dashboard, hotspots) per
// the Database Design doc. Docs without coordinates are simply excluded
// from geo queries — no sparse flag needed.
sightingSchema.index({ 'location.coordinates': '2dsphere' });

export default mongoose.model('Sighting', sightingSchema);