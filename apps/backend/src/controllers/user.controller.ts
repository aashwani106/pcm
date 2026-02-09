import { Request, Response } from 'express';
import { getUsers } from '../services/user.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function listUsers(req: Request, res: Response) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const users = await getUsers(limit);

  return res
    .status(200)
    .json(new ApiResponse(true, users, 'Users fetched successfully', null));
}
