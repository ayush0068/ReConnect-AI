/**
 * Seeds the Roles collection with the platform's default roles and
 * permissions. Must be run once against a fresh database before anyone
 * can register — auth.service.js looks up a Role document by name and
 * fails fast with a clear error if it isn't found yet.
 *
 * Run with: npm run seed:roles
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Role from '../models/Role.model.js';

const roles = [
  { name: 'family', permissions: ['case:create', 'case:update-own', 'case:view-own'] },
  { name: 'citizen', permissions: ['sighting:create'] },
  {
    name: 'police',
    permissions: [
      'case:view', 'match:review', 'match:approve', 'match:reject',
      'sighting:verify', 'analytics:view',
    ],
  },
  { name: 'hospital', permissions: ['found-person:create', 'found-person:update-own'] },
  { name: 'ngo', permissions: ['found-person:create', 'found-person:update-own'] },
  { name: 'shelter', permissions: ['found-person:create', 'found-person:update-own'] },
  {
    name: 'admin',
    permissions: [
      'user:manage', 'organization:verify', 'settings:manage',
      'audit-log:view', 'match:approve', 'match:reject', 'analytics:view',
    ],
  },
];

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('[seed] connected to MongoDB');

  for (const role of roles) {
    await Role.findOneAndUpdate(
      { name: role.name },
      { $set: { permissions: role.permissions } },
      { upsert: true, new: true }
    );
    console.log(`[seed] upserted role: ${role.name}`);
  }

  console.log('[seed] done');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});