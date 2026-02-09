import { findAttendanceByStudentAndDate, insertAttendance } from '../models/attendance.model';
import { findHolidayByDate } from '../models/holiday.model';
import { ApiError } from '../utils/ApiError';
import { getTodayLocalISODate } from '../utils/date';
import { isWithinTimeWindow } from '../utils/timeWindow';

export async function markAttendanceForStudent(studentId: string) {
  if (!isWithinTimeWindow()) {
    throw new ApiError(400, 'Attendance window closed');
  }

  const today = getTodayLocalISODate();

  const { data: holiday, error: holidayError } = await findHolidayByDate(today);
  if (holidayError) {
    throw new ApiError(500, 'Failed to verify holiday', holidayError);
  }
  if (holiday) {
    throw new ApiError(400, 'Attendance is blocked on holiday');
  }

  const { data: existing, error: existingError } = await findAttendanceByStudentAndDate(studentId, today);
  if (existingError) {
    throw new ApiError(500, 'Failed to verify attendance', existingError);
  }
  if (existing) {
    throw new ApiError(409, 'Attendance already marked');
  }

  const { error: insertError } = await insertAttendance({
    studentId,
    date: today,
    status: 'present',
    markedAt: new Date().toISOString(),
    markedBy: 'student',
    remark: null,
  });

  if (insertError) {
    throw new ApiError(500, 'Failed to mark attendance', insertError);
  }

  return { studentId, date: today, status: 'present' as const };
}
