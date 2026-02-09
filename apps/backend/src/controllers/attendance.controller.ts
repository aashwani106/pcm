import { Response } from 'express';
import { markAttendanceForStudent } from '../services/attendance.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function markAttendance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const data = await markAttendanceForStudent(userId);

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Attendance marked successfully', null));
}
