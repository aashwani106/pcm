import { Router } from 'express';
import {
  getAdminAttendance,
  getAdminStudentAttendanceCalendar,
  getAdminStudentAttendanceHistory,
  markManualAttendance,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/attendance', requireAuth, requireAdmin, asyncHandler(getAdminAttendance));
router.post('/attendance/manual', requireAuth, requireAdmin, asyncHandler(markManualAttendance));
router.get(
  '/students/:studentId/attendance-calendar',
  requireAuth,
  requireAdmin,
  asyncHandler(getAdminStudentAttendanceCalendar)
);
router.get(
  '/students/:studentId/attendance-history',
  requireAuth,
  requireAdmin,
  asyncHandler(getAdminStudentAttendanceHistory)
);

export default router;
