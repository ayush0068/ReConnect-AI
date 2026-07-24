import mongoose from 'mongoose';

const missingPersonSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 130 },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'unknown'],
      default: 'unknown',
    },
    height: { type: Number, min: 0 }, // cm
    photos: [{ type: String, trim: true }], // image URLs; Cloudinary upload wiring lands with the media module
    identifyingMarks: [{ type: String, trim: true }],
    clothingDescription: { type: String, trim: true },
    descriptionText: { type: String, required: true, trim: true },
    lastKnownLocation: {
      address: { type: String, trim: true },
      // [longitude, latitude] — legacy coordinate pair format, indexable
      // by a 2dsphere index (see Database Design doc). Set from the
      // Leaflet location picker on the report/edit forms.
      coordinates: { type: [Number], default: undefined },
    },
    lastSeenAt: { type: Date },
    // AI status lifecycle per the Database Design doc — embedding/matching
    // is handled by the AI service module once it's wired up; every new
    // report starts pending until that job picks it up.
    status: {
      type: String,
      enum: ['pending_embedding', 'active', 'matched', 'closed', 'cold'],
      default: 'pending_embedding',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

missingPersonSchema.index({ reportedBy: 1 });
missingPersonSchema.index({ status: 1 });
// Powers map views and proximity lookups per the Database Design doc.
missingPersonSchema.index({ 'lastKnownLocation.coordinates': '2dsphere' });

export default mongoose.model('MissingPerson', missingPersonSchema);