import { Response } from 'express';
import { getAttendanceForDate } from '../services/attendance.admin.service';
import { getStudentAttendanceCalendar } from '../services/attendance.calendar.service';
import { getStudentAttendanceHistory } from '../services/attendance.history.service';
import { markAttendanceManuallyByAdmin } from '../services/attendance.manual.service';
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

function parseMonthOrCurrent(rawMonth: string | undefined): string {
  if (!rawMonth) {
    return getTodayLocalISODate().slice(0, 7);
  }
  if (!/^\d{4}-\d{2}$/.test(rawMonth)) {
    throw new ApiError(400, 'Invalid month format. Use YYYY-MM');
  }
  return rawMonth;
}

export async function getAdminAttendance(req: AuthenticatedRequest, res: Response) {
  const date = parseDateOrThrow(
    typeof req.query.date === 'string' ? req.query.date : undefined
  );
  const data = await getAttendanceForDate(date);

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Attendance loaded successfully', null));
}

export async function getAdminStudentAttendanceHistory(
  req: AuthenticatedRequest,
  res: Response
) {
  const studentId = typeof req.params.studentId === 'string' ? req.params.studentId : '';
  if (!studentId) {
    throw new ApiError(400, 'studentId is required');
  }

  const date = parseDateOrThrow(
    typeof req.query.date === 'string' ? req.query.date : undefined
  );

  const data = await getStudentAttendanceHistory(studentId, date);
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Student history loaded successfully', null));
}

export async function getAdminStudentAttendanceCalendar(
  req: AuthenticatedRequest,
  res: Response
) {
  const studentId = typeof req.params.studentId === 'string' ? req.params.studentId : '';
  if (!studentId) {
    throw new ApiError(400, 'studentId is required');
  }

  const month = parseMonthOrCurrent(
    typeof req.query.month === 'string' ? req.query.month : undefined
  );
  const data = await getStudentAttendanceCalendar(studentId, month);

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Student calendar loaded successfully', null));
}

export async function markManualAttendance(req: AuthenticatedRequest, res: Response) {
  const body = req.body as {
    student_id?: string;
    status?: 'present' | 'absent';
    remark?: string;
    date?: string;
  };

  const studentId = (body.student_id ?? '').trim();
  const status = body.status;
  const remark = (body.remark ?? '').trim();
  const date = body.date?.trim() || getTodayLocalISODate();

  if (!studentId) {
    throw new ApiError(400, 'student_id is required');
  }
  if (status !== 'present' && status !== 'absent') {
    throw new ApiError(400, "status must be 'present' or 'absent'");
  }
  if (!remark) {
    throw new ApiError(400, 'remark is required for manual attendance');
  }

  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
  }

  const data = await markAttendanceManuallyByAdmin({
    studentId,
    status,
    remark,
    date,
  });

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Manual attendance saved successfully', null));
}
