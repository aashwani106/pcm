import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  approveJoinRequest,
  createJoinRequest,
  endLiveSession,
  getJoinRequestStatus,
  getLiveSessionState,
  joinLiveSessionAsTeacher,
  listJoinRequests,
  rejectJoinRequest,
  streamJoinRequestStatus,
  streamSessionJoinRequests,
  startLiveSession,
} from '../controllers/live-session.controller';

const router = Router();

router.post('/start', requireAuth, requireRole('teacher'), asyncHandler(startLiveSession));
router.get('/:id/state', asyncHandler(getLiveSessionState));
router.post('/:id/request', asyncHandler(createJoinRequest));
router.get('/:id/requests', requireAuth, requireRole('teacher'), asyncHandler(listJoinRequests));
router.get('/:id/requests/stream', asyncHandler(streamSessionJoinRequests));
router.get('/:id/requests/:requestId', asyncHandler(getJoinRequestStatus));
router.get('/:id/requests/:requestId/stream', asyncHandler(streamJoinRequestStatus));
router.post(
  '/:id/requests/:requestId/approve',
  requireAuth,
  requireRole('teacher'),
  asyncHandler(approveJoinRequest)
);
router.post(
  '/:id/requests/:requestId/reject',
  requireAuth,
  requireRole('teacher'),
  asyncHandler(rejectJoinRequest)
);
router.post('/:id/join-teacher', requireAuth, requireRole('teacher'), asyncHandler(joinLiveSessionAsTeacher));
router.post('/:id/end', requireAuth, requireRole('teacher'), asyncHandler(endLiveSession));

export default router;
