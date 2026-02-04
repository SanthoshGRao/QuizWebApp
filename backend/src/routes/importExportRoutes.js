import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import { importQuestions, exportQuiz } from '../controllers/importExportController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
router.use(authenticate);

router.post('/questions', authorize(['admin']), upload.single('file'), importQuestions);
router.get('/quiz/:quizId', authorize(['admin']), exportQuiz);

export default router;
