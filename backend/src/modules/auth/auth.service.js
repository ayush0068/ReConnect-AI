import bcrypt from 'bcryptjs';
import User from '../../models/User.model.js';
import Role from '../../models/Role.model.js';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.util.js';
import { AppError } from '../../utils/AppError.js';

const SALT_ROUNDS = 12;

export async function registerUser({ fullName, email, phone, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_IN_USE');
  }

  const roleDoc = await Role.findOne({ name: role });
  if (!roleDoc) {
    // Should only happen if the Role collection hasn't been seeded yet.
    throw new AppError(
      `Role "${role}" not found — run the role seed script first`,
      500,
      'ROLE_NOT_SEEDED'
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    fullName,
    email,
    phone,
    passwordHash,
    role: roleDoc._id,
    status: 'active', // family/citizen accounts are active immediately; org accounts are not (separate flow)
  });

  return sanitizeUser(user, roleDoc.name);
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash').populate('role');
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS');
  }

  if (user.status === 'suspended') {
    throw new AppError('This account has been suspended', 403, 'ACCOUNT_SUSPENDED');
  }
  if (user.status === 'pending_verification') {
    throw new AppError('This organization account is awaiting admin verification', 403, 'ORG_NOT_VERIFIED');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokenPayload = { sub: user._id.toString(), role: user.role.name };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  return {
    user: sanitizeUser(user, user.role.name),
    accessToken,
    refreshToken,
  };
}

function sanitizeUser(user, roleName) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: roleName,
    status: user.status,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}