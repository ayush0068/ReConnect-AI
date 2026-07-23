import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Tighter rate limit on auth endpoints specifically — these are the
// most common brute-force/credential-stuffing target on any platform.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, me);

export default router;