import { Router } from 'express';
import { adminCreateUser, completeMyPasswordChange, listUsers } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), asyncHandler(listUsers));
router.post('/', requireAuth, requireRole('admin'), asyncHandler(adminCreateUser));
router.post('/me/complete-password-change', requireAuth, asyncHandler(completeMyPasswordChange));

export default router;
