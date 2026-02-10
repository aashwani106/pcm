import { listHolidaysBetween } from '../models/holiday.model';
import { findStudentById } from '../models/student.model';
import { ApiError } from '../utils/ApiError';
import { supabaseAdmin } from '../config/supabase';

export interface AttendanceDayDetail {
  attendance_id: string;
  status: 'present' | 'absent';
  marked_at: string | null;
  marked_by: 'student' | 'admin' | null;
  remark: string | null;
  photo_url: string | null;
  accuracy_meters: number | null;
  review_status: 'accepted' | 'flagged' | null;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by_role: 'admin' | 'parent' | null;
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

type CalendarAttendanceRow = {
  id: string;
  date: string | Date;
  status: string | null;
  marked_at: string | null;
  marked_by?: string | null;
  remark?: string | null;
  review_status?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by_role?: string | null;
  attendance_photos?:
    | Array<{ photo_url: string | null; accuracy_meters: number | null; created_at: string | null }>
    | null;
};

async function fetchCalendarAttendanceRows(
  studentId: string,
  startDate: string,
  endDate: string
) {
  const attempts = [
    'id, date, status, marked_at, marked_by, remark, review_status, review_note, reviewed_at, reviewed_by_role, attendance_photos(photo_url, accuracy_meters, created_at)',
    'id, date, status, marked_at, marked_by, remark, attendance_photos(photo_url, accuracy_meters, created_at)',
    'id, date, status, marked_at, marked_by, remark',
  ];

  for (let i = 0; i < attempts.length; i += 1) {
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select(attempts[i])
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (!error) {
      return { data: (data ?? []) as unknown as CalendarAttendanceRow[], error: null as null };
    }

    const isLast = i === attempts.length - 1;
    if (isLast) {
      return { data: null, error };
    }
  }

  return { data: null, error: new Error('Unknown attendance query error') };
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
      fetchCalendarAttendanceRows(studentId, startDate, endDate),
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

    const reviewStatus =
      row.review_status === 'accepted' || row.review_status === 'flagged'
        ? (row.review_status as 'accepted' | 'flagged')
        : null;
    const reviewedByRole =
      row.reviewed_by_role === 'admin' || row.reviewed_by_role === 'parent'
        ? (row.reviewed_by_role as 'admin' | 'parent')
        : null;
    const photos = Array.isArray(row.attendance_photos)
      ? row.attendance_photos
      : [];
    const latestPhoto = photos.length > 0 ? photos[0] : null;
    const accuracy =
      latestPhoto &&
      typeof latestPhoto.accuracy_meters === 'number' &&
      Number.isFinite(latestPhoto.accuracy_meters)
        ? Number(latestPhoto.accuracy_meters)
        : null;

    attendanceByDate[date] = {
      attendance_id: row.id,
      status,
      marked_at: row.marked_at ?? null,
      marked_by: markedBy,
      remark: row.remark ?? null,
      photo_url:
        latestPhoto && typeof latestPhoto.photo_url === 'string'
          ? latestPhoto.photo_url
          : null,
      accuracy_meters: accuracy,
      review_status: reviewStatus,
      review_note: row.review_note ?? null,
      reviewed_at: row.reviewed_at ?? null,
      reviewed_by_role: reviewedByRole,
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
