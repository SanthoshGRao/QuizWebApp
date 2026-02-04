import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createQuiz,
  listQuizzes,
  getQuizDetail,
  submitQuiz,
  autoSaveAnswer,
  addQuestionsFromBank,
} from '../controllers/quizController.js';
import { startAttempt, getAttempt } from '../controllers/attemptController.js';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../controllers/questionController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listQuizzes);
router.get('/:quizId', getQuizDetail);
router.post('/:quizId/start', authorize(['student']), startAttempt);
router.get('/:quizId/attempt', authorize(['student']), getAttempt);
router.post('/:quizId/submit', authorize(['student']), submitQuiz);
router.post('/:quizId/auto-save', authorize(['student']), autoSaveAnswer);

router.post('/', authorize(['admin']), createQuiz);
router.post('/:quizId/add-from-bank', authorize(['admin']), addQuestionsFromBank);
router.post('/:quizId/questions', authorize(['admin']), createQuestion);
router.put('/questions/:id', authorize(['admin']), updateQuestion);
router.delete('/questions/:id', authorize(['admin']), deleteQuestion);

export default router;

