import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireParent, requireStudent } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getMyParentCalendar, getMyStudentCalendar } from '../controllers/calendar.controller';

const router = Router();

router.get('/student', requireAuth, requireStudent, asyncHandler(getMyStudentCalendar));
router.get('/parent', requireAuth, requireParent, asyncHandler(getMyParentCalendar));

export default router;
