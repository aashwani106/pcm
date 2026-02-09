import { Response } from 'express';
import { getAttendanceForDate } from '../services/attendance.admin.service';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { getTodayLocalISODate } from '../utils/date';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function parseDateOrThrow(rawDate: string | undefined): string {
  if (!rawDate) {
    return getTodayLocalISODate();
  }

  const isDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(rawDate);
  if (!isDateFormat) {
    throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
  }

  const parsed = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, 'Invalid date');
  }

  return rawDate;
}

export async function getAdminAttendance(req: AuthenticatedRequest, res: Response) {
  const date = parseDateOrThrow(
    typeof req.query.date === 'string' ? req.query.date : undefined
  );
  const data = await getAttendanceForDate(date);
  console.log('atten' , data)

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Attendance loaded successfully', null));
}
