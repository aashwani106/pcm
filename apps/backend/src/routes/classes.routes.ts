import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { endClass, getClassState, joinClass, startClass } from '../controllers/classes.controller';

const router = Router();

router.post('/:id/start', requireAuth, requireRole('teacher'), asyncHandler(startClass));
router.get('/:id/state', requireAuth, asyncHandler(getClassState));
router.post('/:id/join', requireAuth, asyncHandler(joinClass));
router.post('/:id/end', requireAuth, asyncHandler(endClass));

export default router;
