import { listAttendanceForStudentBetween } from '../models/attendance.model';
import { findStudentById } from '../models/student.model';
import { ApiError } from '../utils/ApiError';

export interface AttendanceWindowSummary {
  days: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface StudentAttendanceHistoryResult {
  student_id: string;
  name: string;
  date: string;
  attendance_percentage: number;
  last_7_days: AttendanceWindowSummary;
  last_30_days: AttendanceWindowSummary;
  absent_streak: number;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(base.getDate() + days);
  return d;
}

function clampPercentage(present: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((present / total) * 10000) / 100;
}

export async function getStudentAttendanceHistory(
  studentId: string,
  endDateISO: string
): Promise<StudentAttendanceHistoryResult> {
  const endDate = new Date(`${endDateISO}T00:00:00`);
  if (Number.isNaN(endDate.getTime())) {
    throw new ApiError(400, 'Invalid date');
  }

  const { data: student, error: studentError } = await findStudentById(studentId);
  if (studentError) {
    throw new ApiError(500, 'Failed to load student', studentError);
  }
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  const startDate90 = toISODate(shiftDate(endDate, -89));
  const endDateText = toISODate(endDate);

  const { data: rows, error: rowsError } = await listAttendanceForStudentBetween(
    studentId,
    startDate90,
    endDateText
  );
  if (rowsError) {
    throw new ApiError(500, 'Failed to load attendance history', rowsError);
  }

  const statusByDate = new Map<string, string | null>();
  for (const row of rows ?? []) {
    if (typeof row.date === 'string') {
      statusByDate.set(row.date, row.status ?? null);
    }
  }

  const summarize = (days: number): AttendanceWindowSummary => {
    let present = 0;
    for (let i = 0; i < days; i += 1) {
      const current = toISODate(shiftDate(endDate, -i));
      if (statusByDate.get(current) === 'present') {
        present += 1;
      }
    }

    const absent = days - present;
    return {
      days,
      present,
      absent,
      percentage: clampPercentage(present, days),
    };
  };

  const last7 = summarize(7);
  const last30 = summarize(30);

  let absentStreak = 0;
  for (let i = 0; i < 90; i += 1) {
    const current = toISODate(shiftDate(endDate, -i));
    if (statusByDate.get(current) === 'present') {
      break;
    }
    absentStreak += 1;
  }

  return {
    student_id: studentId,
    name: `Student ${studentId.slice(0, 8)}`,
    date: endDateText,
    attendance_percentage: last30.percentage,
    last_7_days: last7,
    last_30_days: last30,
    absent_streak: absentStreak,
  };
}
