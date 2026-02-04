import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  adminDashboard,
  listClasses,
  getStudentPerformance,
  exportQuizResults,
} from '../controllers/adminController.js';
import { listLogs } from '../controllers/logController.js';
import { updateQuiz, deleteQuiz, publishQuizNow } from '../controllers/quizController.js';

const router = express.Router();

router.use(authenticate, authorize(['admin']));

router.get('/dashboard', adminDashboard);
router.get('/logs', listLogs);
router.get('/classes', listClasses);
router.get('/students/:id/performance', getStudentPerformance);
router.get('/quizzes/:id/export', exportQuizResults);

router.put('/quizzes/:id', updateQuiz);
router.post('/quizzes/:id/publish-now', publishQuizNow);
router.delete('/quizzes/:id', deleteQuiz);

export default router;

