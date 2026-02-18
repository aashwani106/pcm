import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError';
import {
  getClassStateService,
  endClassService,
  joinClassService,
  startClassService,
} from '../services/classes.service';

export async function startClass(req: AuthenticatedRequest, res: Response) {
  const classId =
    typeof req.params.id === 'string'
      ? req.params.id
      : Array.isArray(req.params.id)
        ? req.params.id[0]
        : '';
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  if (!classId) {
    throw new ApiError(400, 'Class id is required');
  }

  const result = await startClassService({
    classId,
    userId,
  });

  return res.json(result);
}

export async function joinClass(req: AuthenticatedRequest, res: Response) {
  const classId =
    typeof req.params.id === 'string'
      ? req.params.id
      : Array.isArray(req.params.id)
        ? req.params.id[0]
        : '';
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  if (!classId) {
    throw new ApiError(400, 'Class id is required');
  }

  const result = await joinClassService({
    classId,
    userId,
  });

  return res.json(result);
}

export async function getClassState(req: AuthenticatedRequest, res: Response) {
  const classId =
    typeof req.params.id === 'string'
      ? req.params.id
      : Array.isArray(req.params.id)
        ? req.params.id[0]
        : '';
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  if (!classId) {
    throw new ApiError(400, 'Class id is required');
  }

  const result = await getClassStateService({
    classId,
    userId,
  });

  return res.json(result);
}

export async function endClass(req: AuthenticatedRequest, res: Response) {
  const classId =
    typeof req.params.id === 'string'
      ? req.params.id
      : Array.isArray(req.params.id)
        ? req.params.id[0]
        : '';
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  if (!classId) {
    throw new ApiError(400, 'Class id is required');
  }

  const result = await endClassService({
    classId,
    userId,
  });

  return res.json(result);
}
