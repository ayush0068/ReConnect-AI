import { AppError } from '../utils/AppError.js';

/**
 * requireRole('police', 'admin') — restricts a route to specific role names.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_TOKEN_MISSING'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have access to this resource', 403, 'RBAC_FORBIDDEN'));
    }
    next();
  };
}

/**
 * requirePermission('case:create') — restricts a route to a specific
 * granular permission stored on the user's Role document, per the
 * Roles collection design (name + permissions[]).
 */
export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_TOKEN_MISSING'));
    }
    const hasAll = requiredPermissions.every((p) => req.user.permissions?.includes(p));
    if (!hasAll) {
      return next(new AppError('You do not have access to this resource', 403, 'RBAC_FORBIDDEN'));
    }
    next();
  };
}