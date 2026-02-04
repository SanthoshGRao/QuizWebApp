import express from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import {
  login,
  forgotPassword,
  resetPassword,
  me,
  firstTimeReset,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authLimiter, login);
router.get('/me', authenticate, me);
router.post('/first-reset', authenticate, firstTimeReset);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;

