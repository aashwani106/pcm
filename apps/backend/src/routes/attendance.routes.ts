import { Router } from 'express';
import { markAttendance } from '../controllers/attendance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/mark', requireAuth, requireRole('student'), asyncHandler(markAttendance));

export default router;
