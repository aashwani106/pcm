import { NextFunction, Response } from 'express';
import { findProfileRoleById } from '../models/profile.model';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from './auth.middleware';

export function requireRole(role: 'student' | 'admin' | 'parent') {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { data, error } = await findProfileRoleById(userId);
      if (error || !data) {
        throw new ApiError(403, 'Forbidden');
      }

      if (data.role !== role) {
        throw new ApiError(403, 'Forbidden');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
