import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import {
  getParentAttendanceCalendar,
  getStudentSelfAttendanceCalendar,
} from '../services/attendance.calendar.access.service';
import { getTodayLocalISODate } from '../utils/date';

function parseMonthOrCurrent(rawMonth: string | undefined): string {
  if (!rawMonth) {
    return getTodayLocalISODate().slice(0, 7);
  }
  if (!/^\d{4}-\d{2}$/.test(rawMonth)) {
    throw new ApiError(400, 'Invalid month format. Use YYYY-MM');
  }
  return rawMonth;
}

export async function getMyStudentCalendar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  const month = parseMonthOrCurrent(
    typeof req.query.month === 'string' ? req.query.month : undefined
  );

  const data = await getStudentSelfAttendanceCalendar(userId, month);
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Student calendar loaded successfully', null));
}

export async function getMyParentCalendar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  const month = parseMonthOrCurrent(
    typeof req.query.month === 'string' ? req.query.month : undefined
  );
  const studentId =
    typeof req.query.student_id === 'string' ? req.query.student_id : undefined;

  const data = await getParentAttendanceCalendar(userId, month, studentId);
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Parent calendar loaded successfully', null));
}
