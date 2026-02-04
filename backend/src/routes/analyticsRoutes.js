import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getStudentAnalytics, getAdminAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();
router.use(authenticate);

router.get('/student', authorize(['student']), getStudentAnalytics);
router.get('/admin', authorize(['admin']), getAdminAnalytics);

export default router;
