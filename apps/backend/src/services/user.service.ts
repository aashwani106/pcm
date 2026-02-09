import { listProfiles } from '../models/profile.model';
import { ApiError } from '../utils/ApiError';

export async function getUsers(limit?: number) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Number(limit), 1), 500) : 100;
  const { data, error } = await listProfiles(safeLimit);

  if (error) {
    throw new ApiError(500, 'Failed to fetch users', error);
  }

  return data ?? [];
}
