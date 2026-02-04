import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getMyResults,
  getMyProfile,
  updateMyProfile,
  getMyQuizResultDetail,
} from '../controllers/studentController.js';

const router = express.Router();

router.use(authenticate, authorize(['student']));

router.get('/results', getMyResults);
router.get('/result/:quizId', getMyQuizResultDetail);
router.get('/profile', getMyProfile);
router.patch('/profile', updateMyProfile);

export default router;
