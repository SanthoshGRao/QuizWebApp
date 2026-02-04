import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getLeaderboard, exportLeaderboard, getLeaderboardQuizzes, getLeaderboardClasses } from '../controllers/leaderboardController.js';

const router = express.Router();
router.use(authenticate);
router.get('/classes', getLeaderboardClasses);
router.get('/quizzes', getLeaderboardQuizzes);
router.get('/export', authorize(['admin']), exportLeaderboard);
router.get('/', getLeaderboard);

export default router;
