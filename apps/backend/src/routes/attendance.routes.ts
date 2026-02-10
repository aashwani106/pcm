import { Router } from 'express';
import {
  getAttendancePhotoViewUrlForRecord,
  getPhotoUploadUrl,
  markAttendance,
  reviewAttendance,
} from '../controllers/attendance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/photo-upload-url',
  requireAuth,
  requireRole('student'),
  asyncHandler(getPhotoUploadUrl)
);
router.post('/mark', requireAuth, requireRole('student'), asyncHandler(markAttendance));
router.post('/review', requireAuth, asyncHandler(reviewAttendance));
router.get('/:attendanceId/photo-view-url', requireAuth, asyncHandler(getAttendancePhotoViewUrlForRecord));

export default router;
