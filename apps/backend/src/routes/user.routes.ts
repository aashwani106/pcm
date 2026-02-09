import { Router } from 'express';
import { listUsers } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), asyncHandler(listUsers));

export default router;
