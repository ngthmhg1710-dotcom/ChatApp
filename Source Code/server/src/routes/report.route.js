import express from 'express';
import {
  createReport,
  getMyReports,
  getReports,
  updateReportStatus
} from '../controllers/report.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createReport);
router.get('/my', getMyReports);
router.get('/', authorize('admin', 'moderator'), getReports);
router.patch('/:id/status', authorize('admin', 'moderator'), updateReportStatus);

export default router;
