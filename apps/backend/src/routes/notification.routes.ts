import { Router } from 'express';
import {
  getMyNotifications,
  markMyNotificationRead,
  runAbsentNotifications,
} from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin, requireParent } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/admin/absent/run', requireAuth, requireAdmin, asyncHandler(runAbsentNotifications));
router.get('/parent', requireAuth, requireParent, asyncHandler(getMyNotifications));
router.patch('/parent/:id/read', requireAuth, requireParent, asyncHandler(markMyNotificationRead));

export default router;
