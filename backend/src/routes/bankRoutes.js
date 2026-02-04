import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listBankQuestions,
  createBankQuestion,
  getBankQuestion,
  cloneToQuiz,
} from '../controllers/questionBankController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize(['admin']), listBankQuestions);
router.post('/', authorize(['admin']), createBankQuestion);
router.get('/:id', authorize(['admin']), getBankQuestion);
router.post('/:id/clone', authorize(['admin']), cloneToQuiz);

export default router;
