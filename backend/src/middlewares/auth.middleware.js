import { verifyAccessToken } from '../utils/jwt.util.js';
import User from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_TOKEN_MISSING');
    }

    const token = header.split(' ')[1];
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError('Session expired, please sign in again', 401, 'AUTH_TOKEN_EXPIRED');
    }

    const user = await User.findById(payload.sub).populate('role');
    if (!user || user.status !== 'active') {
      throw new AppError('Account not active', 403, 'ACCOUNT_INACTIVE');
    }

    req.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions,
      organizationId: user.organizationId,
    };
    next();
  } catch (err) {
    next(err);
  }
}