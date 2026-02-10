import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError';
import { completeMyForcedPasswordChange, createUserByAdmin, getUsers } from '../services/user.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function listUsers(req: Request, res: Response) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const users = await getUsers(limit);

  return res
    .status(200)
    .json(new ApiResponse(true, users, 'Users fetched successfully', null));
}

export async function adminCreateUser(req: Request, res: Response) {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const role = req.body?.role;
  const batch = typeof req.body?.batch === 'string' ? req.body.batch : undefined;
  const parentId = typeof req.body?.parent_id === 'string' ? req.body.parent_id : undefined;

  if (role !== 'student' && role !== 'parent') {
    throw new ApiError(400, 'Role must be student or parent');
  }
  if (role === 'student' && !parentId) {
    throw new ApiError(400, 'parent_id is required for student');
  }

  const result = await createUserByAdmin({
    email,
    role,
    batch,
    parent_id: parentId,
  });

  return res
    .status(201)
    .json(new ApiResponse(true, result, 'User created successfully', null));
}

export async function completeMyPasswordChange(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const result = await completeMyForcedPasswordChange(userId);
  return res
    .status(200)
    .json(new ApiResponse(true, result, 'Password-change flag updated', null));
}
