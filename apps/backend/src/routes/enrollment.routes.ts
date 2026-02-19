import { Router } from 'express';
import {
  approveEnrollment,
  createEnrollmentRequest,
  getEnrollmentRequests,
  rejectEnrollment,
} from '../controllers/enrollment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', asyncHandler(createEnrollmentRequest));
router.get('/admin', requireAuth, requireAdmin, asyncHandler(getEnrollmentRequests));
router.post('/admin/:id/approve', requireAuth, requireAdmin, asyncHandler(approveEnrollment));
router.post('/admin/:id/reject', requireAuth, requireAdmin, asyncHandler(rejectEnrollment));

export default router;
