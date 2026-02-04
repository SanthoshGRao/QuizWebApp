import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listNotifications,
  markRead,
  markAllRead,
} from '../controllers/notificationController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
