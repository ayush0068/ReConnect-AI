import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', globalLimiter);

// --- Route registration ---
// As each remaining module (missingPersons, foundPersons, sightings,
// matches, notifications, analytics, auditLogs) is implemented per the
// API Specification, mount it here the same way.
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;