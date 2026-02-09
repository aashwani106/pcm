import { Router } from 'express';
import { getAdminAttendance } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/attendance', requireAuth, requireAdmin, asyncHandler(getAdminAttendance));

export default router;
