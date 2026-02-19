import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  approveEnrollmentRequest,
  listEnrollmentRequests,
  rejectEnrollmentRequest,
  submitEnrollmentRequest,
} from '../services/enrollment.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export async function createEnrollmentRequest(req: Request, res: Response) {
  const result = await submitEnrollmentRequest(req.body);
  return res
    .status(201)
    .json(new ApiResponse(true, result, 'Enrollment request received', null));
}

export async function getEnrollmentRequests(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const data = await listEnrollmentRequests(status as 'pending' | 'approved' | 'rejected' | undefined);
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Enrollment requests fetched successfully', null));
}

export async function approveEnrollment(req: AuthenticatedRequest, res: Response) {
  const adminId = req.user?.id;
  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const requestId = typeof req.params.id === 'string' ? req.params.id : '';
  if (!requestId) throw new ApiError(400, 'Enrollment request id is required');

  const result = await approveEnrollmentRequest(requestId, adminId);
  return res
    .status(200)
    .json(new ApiResponse(true, result, 'Enrollment request approved successfully', null));
}

export async function rejectEnrollment(req: AuthenticatedRequest, res: Response) {
  const adminId = req.user?.id;
  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const requestId = typeof req.params.id === 'string' ? req.params.id : '';
  if (!requestId) throw new ApiError(400, 'Enrollment request id is required');

  const reason = typeof req.body?.reason === 'string' ? req.body.reason : null;
  const result = await rejectEnrollmentRequest(requestId, adminId, reason);
  return res
    .status(200)
    .json(new ApiResponse(true, result, 'Enrollment request rejected successfully', null));
}
