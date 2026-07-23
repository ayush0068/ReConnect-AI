import { registerSchema, loginSchema } from './auth.validation.js';
import { registerUser, loginUser } from './auth.service.js';
import { AppError } from '../../utils/AppError.js';

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.errors[0]?.message || 'Invalid input',
        422,
        'VALIDATION_ERROR'
      );
    }

    const user = await registerUser(parsed.data);

    res.status(201).json({
      success: true,
      data: { user },
      error: null,
      meta: {},
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.errors[0]?.message || 'Invalid input',
        422,
        'VALIDATION_ERROR'
      );
    }

    const { user, accessToken, refreshToken } = await loginUser(parsed.data);

    // Refresh token as an httpOnly cookie; access token returned in body
    // for the frontend to attach as a Bearer header (see apiClient.js).
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: { user, accessToken },
      error: null,
      meta: {},
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  // req.user is populated by the auth.middleware.js after verifying the JWT
  res.status(200).json({
    success: true,
    data: { user: req.user },
    error: null,
    meta: {},
  });
}