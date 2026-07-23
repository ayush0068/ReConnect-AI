import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    isVerified: { type: Boolean, default: false }, // org-affiliated accounts require admin verification
    trustScore: { type: Number, default: 100 },
    isAnonymousReporter: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'active',
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true } // adds createdAt, updatedAt
);

userSchema.index({ organizationId: 1 });
userSchema.index({ role: 1 });

export default mongoose.model('User', userSchema);