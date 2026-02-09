import { listAttendanceForStudentBetween } from '../models/attendance.model';
import { listHolidaysBetween } from '../models/holiday.model';
import { findStudentById } from '../models/student.model';
import { ApiError } from '../utils/ApiError';

export interface AttendanceDayDetail {
  status: 'present' | 'absent';
  marked_at: string | null;
  marked_by: 'student' | 'admin' | null;
  remark: string | null;
}

export interface StudentAttendanceCalendarResult {
  student: {
    id: string;
    name: string;
    batch: string | null;
  };
  month: string;
  attendance_by_date: Record<string, AttendanceDayDetail>;
  holidays: string[];
}

function getMonthRange(month: string) {
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(month);
  if (!monthMatch) {
    throw new ApiError(400, 'Invalid month format. Use YYYY-MM');
  }

  const year = Number(monthMatch[1]);
  const monthIndex = Number(monthMatch[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new ApiError(400, 'Invalid month');
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toISO(start), endDate: toISO(end) };
}

export async function getStudentAttendanceCalendar(studentId: string, month: string) {
  const { data: student, error: studentError } = await findStudentById(studentId);
  if (studentError) {
    throw new ApiError(500, 'Failed to load student', studentError);
  }
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  const { startDate, endDate } = getMonthRange(month);

  const [{ data: attendanceRows, error: attendanceError }, { data: holidayRows, error: holidayError }] =
    await Promise.all([
      listAttendanceForStudentBetween(studentId, startDate, endDate),
      listHolidaysBetween(startDate, endDate),
    ]);

  if (attendanceError) {
    throw new ApiError(500, 'Failed to load attendance calendar', attendanceError);
  }
  if (holidayError) {
    throw new ApiError(500, 'Failed to load holidays', holidayError);
  }

  const attendanceByDate: Record<string, AttendanceDayDetail> = {};
  for (const row of attendanceRows ?? []) {
    const date = typeof row.date === 'string' ? row.date : String(row.date);
    const status = row.status === 'present' ? 'present' : 'absent';
    const markedBy =
      row.marked_by === 'admin' || row.marked_by === 'student'
        ? (row.marked_by as 'admin' | 'student')
        : null;

    attendanceByDate[date] = {
      status,
      marked_at: row.marked_at ?? null,
      marked_by: markedBy,
      remark: row.remark ?? null,
    };
  }

  return {
    student: {
      id: student.id,
      name: `Student ${student.id.slice(0, 8)}`,
      batch: student.batch ?? null,
    },
    month,
    attendance_by_date: attendanceByDate,
    holidays: (holidayRows ?? []).map((h) => String(h.date)),
  } satisfies StudentAttendanceCalendarResult;
}
