/**
 * Creates (or updates) ONE police account directly, bypassing the normal
 * signup flow entirely.
 *
 * Why this exists: per the architecture, organization accounts
 * (police/hospital/ngo/shelter) are supposed to register through a
 * dedicated flow and sit in `pending_verification` until an Admin
 * approves them — but neither the Organization model nor an Admin
 * approval module exist in this codebase yet. Rather than block the
 * police dashboard work on building both of those first, this script is
 * a deliberate, clearly-temporary stand-in: it creates one active police
 * user directly so the police dashboard can actually be logged into and
 * tested.
 *
 * Replace this with the real org-registration + admin-approval flow when
 * that module gets built (see docs/01_System_Architecture.md open
 * decisions) — nothing else in the app depends on *how* a police user
 * was created, only on their role, so swapping this out later is safe.
 *
 * Run with: npm run seed:police
 * Configure via env vars (falls back to defaults for local dev only —
 * override these in your real .env before running against anything
 * other than a local throwaway database):
 *   POLICE_SEED_EMAIL
 *   POLICE_SEED_PASSWORD
 *   POLICE_SEED_FULL_NAME
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import Role from '../models/Role.model.js';
import User from '../models/User.model.js';

const SALT_ROUNDS = 12;

const email = process.env.POLICE_SEED_EMAIL || 'police.demo@reconnect.local';
const password = process.env.POLICE_SEED_PASSWORD || 'ChangeMe123!';
const fullName = process.env.POLICE_SEED_FULL_NAME || 'Demo Police Officer';

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('[seed:police] connected to MongoDB');

  const policeRole = await Role.findOne({ name: 'police' });
  if (!policeRole) {
    console.error('[seed:police] "police" role not found — run `npm run seed:roles` first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        fullName,
        email,
        passwordHash,
        role: policeRole._id,
        isVerified: true,
        status: 'active', // active immediately — this script IS the verification step, for now
      },
    },
    { upsert: true, new: true }
  );

  console.log(`[seed:police] police account ready: ${user.email}`);
  console.log(`[seed:police] password: ${password}`);
  console.log('[seed:police] change this password once a real change-password flow exists.');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed:police] failed:', err);
  process.exit(1);
});