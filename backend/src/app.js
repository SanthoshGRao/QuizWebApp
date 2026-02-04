import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestLogger } from './middleware/logging.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import studentMeRoutes from './routes/studentMeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import bankRoutes from './routes/bankRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import importExportRoutes from './routes/importExportRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

app.use(
  '/api',
  cors({
    origin: env.clientUrls.length > 1 ? env.clientUrls : env.clientUrl,
    credentials: false,
    exposedHeaders: ['Authorization'],
  }),
);
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', apiLimiter, quizRoutes);
app.use('/api/students', apiLimiter, studentRoutes);
app.use('/api/student', apiLimiter, studentMeRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/leaderboard', apiLimiter, leaderboardRoutes);
app.use('/api/bank', apiLimiter, bankRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/import-export', apiLimiter, importExportRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

