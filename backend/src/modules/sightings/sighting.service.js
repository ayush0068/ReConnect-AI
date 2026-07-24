import Sighting from '../../models/Sighting.model.js';
import { AppError } from '../../utils/AppError.js';

export async function createSighting(reqUser, data) {
  const { locationAddress, latitude, longitude, isAnonymous, ...rest } = data;

  const reportedByAnonymousChoice = isAnonymous || !reqUser;
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';

  const sighting = await Sighting.create({
    ...rest,
    reportedBy: reportedByAnonymousChoice ? null : reqUser.id,
    isAnonymous: reportedByAnonymousChoice,
    location:
      locationAddress || hasCoordinates
        ? {
            address: locationAddress,
            // Stored as [longitude, latitude] to match the 2dsphere index.
            coordinates: hasCoordinates ? [longitude, latitude] : undefined,
          }
        : undefined,
  });

  return sighting;
}

export async function listSightings(user, { page = 1, limit = 20 } = {}) {
  // Full listing is a Police/Admin capability per the API Specification;
  // everyone else only gets sightings tied to their own reports.
  const query = {};
  if (!['police', 'admin'].includes(user.role)) {
    query.reportedBy = user.id;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    Sighting.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Sighting.countDocuments(query),
  ]);

  return { items, total, page: pageNum, limit: limitNum };
}

export async function verifySighting(id, user, verificationStatus) {
  if (user.role !== 'police') {
    throw new AppError('You do not have access to this resource', 403, 'RBAC_FORBIDDEN');
  }
  const sighting = await Sighting.findById(id);
  if (!sighting) {
    throw new AppError('Sighting not found', 404, 'NOT_FOUND');
  }
  sighting.verificationStatus = verificationStatus;
  sighting.verifiedBy = user.id;
  await sighting.save();
  return sighting;
}