import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json(new ApiResponse<null>(false, null, err.message, err.errors));
  }

  console.error(err);

  return res
    .status(500)
    .json(new ApiResponse<null>(false, null, 'Internal server error', null));
}
