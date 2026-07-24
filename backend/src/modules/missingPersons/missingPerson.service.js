import MissingPerson from '../../models/MissingPerson.model.js';
import { AppError } from '../../utils/AppError.js';

const VIEW_ALL_ROLES = ['police', 'admin'];

export async function createMissingPerson(reportedById, data) {
  const { lastKnownAddress, latitude, longitude, ...rest } = data;
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';

  const missingPerson = await MissingPerson.create({
    ...rest,
    reportedBy: reportedById,
    lastKnownLocation:
      lastKnownAddress || hasCoordinates
        ? {
            address: lastKnownAddress,
            // Stored as [longitude, latitude] to match the 2dsphere index.
            coordinates: hasCoordinates ? [longitude, latitude] : undefined,
          }
        : undefined,
  });

  return missingPerson;
}

export async function listMissingPersons(user, { page = 1, limit = 20 } = {}) {
  const query = { isDeleted: false };

  // Families only ever see their own reports; police/admin see everything,
  // matching the access column in the API Specification.
  if (!VIEW_ALL_ROLES.includes(user.role)) {
    query.reportedBy = user.id;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    MissingPerson.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    MissingPerson.countDocuments(query),
  ]);

  return { items, total, page: pageNum, limit: limitNum };
}

export async function getMissingPersonById(id, user) {
  const record = await MissingPerson.findOne({ _id: id, isDeleted: false });
  if (!record) {
    throw new AppError('Missing person report not found', 404, 'NOT_FOUND');
  }
  assertCanAccess(record, user);
  return record;
}

export async function updateMissingPerson(id, user, data) {
  const record = await MissingPerson.findOne({ _id: id, isDeleted: false });
  if (!record) {
    throw new AppError('Missing person report not found', 404, 'NOT_FOUND');
  }
  assertCanAccess(record, user);

  const { lastKnownAddress, latitude, longitude, ...rest } = data;
  Object.assign(record, rest);

  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
  if (lastKnownAddress !== undefined || hasCoordinates) {
    record.lastKnownLocation = {
      address: lastKnownAddress !== undefined ? lastKnownAddress : record.lastKnownLocation?.address,
      coordinates: hasCoordinates
        ? [longitude, latitude]
        : record.lastKnownLocation?.coordinates,
    };
  }

  await record.save();
  return record;
}

export async function softDeleteMissingPerson(id, user) {
  const record = await MissingPerson.findOne({ _id: id, isDeleted: false });
  if (!record) {
    throw new AppError('Missing person report not found', 404, 'NOT_FOUND');
  }
  const isOwner = record.reportedBy.toString() === user.id;
  if (!isOwner && user.role !== 'admin') {
    throw new AppError('You do not have access to this resource', 403, 'RBAC_FORBIDDEN');
  }
  record.isDeleted = true;
  await record.save();
  return record;
}

function assertCanAccess(record, user) {
  const isOwner = record.reportedBy.toString() === user.id;
  if (!isOwner && !VIEW_ALL_ROLES.includes(user.role)) {
    throw new AppError('You do not have access to this resource', 403, 'RBAC_FORBIDDEN');
  }
}