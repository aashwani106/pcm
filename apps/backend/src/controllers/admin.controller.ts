import { Response } from 'express';
import { getAttendanceForDate } from '../services/attendance.admin.service';
import { getStudentAttendanceCalendar } from '../services/attendance.calendar.service';
import { getStudentAttendanceHistory } from '../services/attendance.history.service';
import { markAttendanceManuallyByAdmin } from '../services/attendance.manual.service';
import {
  getAdminStudentDetail,
  getAdminStudentList,
  updateAdminStudentCoreInfo,
} from '../services/admin.student.service';
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

export async function getAdminStudents(_req: AuthenticatedRequest, res: Response) {
  const data = await getAdminStudentList();
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Students loaded successfully', null));
}

export async function getAdminStudent(req: AuthenticatedRequest, res: Response) {
  const studentId = typeof req.params.studentId === 'string' ? req.params.studentId : '';
  if (!studentId) {
    throw new ApiError(400, 'studentId is required');
  }

  const data = await getAdminStudentDetail(studentId);
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Student loaded successfully', null));
}

export async function updateAdminStudent(req: AuthenticatedRequest, res: Response) {
  const studentId = typeof req.params.studentId === 'string' ? req.params.studentId : '';
  if (!studentId) {
    throw new ApiError(400, 'studentId is required');
  }

  const body = req.body as {
    full_name?: string;
    class_level?: string | null;
    batch_id?: string | null;
    roll_number?: string | null;
    status?: 'active' | 'paused' | 'left';
    attendance_enabled?: boolean;
    remark?: string | null;
    parent_name?: string | null;
    parent_phone?: string | null;
    parent_email?: string | null;
  };

  if (
    body.status !== undefined &&
    body.status !== 'active' &&
    body.status !== 'paused' &&
    body.status !== 'left'
  ) {
    throw new ApiError(400, "status must be 'active', 'paused', or 'left'");
  }

  const normalize = (value: unknown) => {
    if (value === null) return null;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const data = await updateAdminStudentCoreInfo({
    studentId,
    full_name: body.full_name !== undefined ? normalize(body.full_name) ?? '' : undefined,
    class_level: body.class_level !== undefined ? normalize(body.class_level) : undefined,
    batch_id: body.batch_id !== undefined ? normalize(body.batch_id) : undefined,
    roll_number: body.roll_number !== undefined ? normalize(body.roll_number) : undefined,
    status: body.status,
    attendance_enabled:
      typeof body.attendance_enabled === 'boolean'
        ? body.attendance_enabled
        : undefined,
    remark: body.remark !== undefined ? normalize(body.remark) : undefined,
    parent_name: body.parent_name !== undefined ? normalize(body.parent_name) : undefined,
    parent_phone: body.parent_phone !== undefined ? normalize(body.parent_phone) : undefined,
    parent_email: body.parent_email !== undefined ? normalize(body.parent_email) : undefined,
  });

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Student updated successfully', null));
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
