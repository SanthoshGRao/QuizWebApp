import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  addStudent,
  bulkUploadStudents,
  listStudents,
} from '../controllers/studentController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.use(authenticate, authorize(['admin']));

router.post('/', addStudent);
router.post('/bulk', upload.single('file'), bulkUploadStudents);
router.get('/', listStudents);

export default router;

