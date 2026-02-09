import { listAttendanceByDate } from '../models/attendance.model';
import { listStudents, StudentRow } from '../models/student.model';
import { ApiError } from '../utils/ApiError';

export interface AdminAttendanceRecord {
  student_id: string;
  name: string;
  status: 'present' | 'absent';
  marked_at: string | null;
  accuracy: number | null;
}

export interface AdminAttendanceSummary {
  total: number;
  present: number;
  absent: number;
}

export interface AdminAttendanceResult {
  date: string;
  summary: AdminAttendanceSummary;
  records: AdminAttendanceRecord[];
}

function formatMarkedAt(markedAtISO: string | null): string | null {
  if (!markedAtISO) {
    return null;
  }

  const d = new Date(markedAtISO);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getStudentName(student: StudentRow): string {
  return `Student ${student.id.slice(0, 8)}`;
}

export async function getAttendanceForDate(date: string): Promise<AdminAttendanceResult> {
  const [{ data: students, error: studentsError }, { data: attendance, error: attendanceError }] =
    await Promise.all([listStudents(), listAttendanceByDate(date)]);

  if (studentsError) {
    throw new ApiError(500, 'Failed to load students', studentsError);
  }

  if (attendanceError) {
    throw new ApiError(500, 'Failed to load attendance', attendanceError);
  }

  const attendanceByStudentId = new Map((attendance ?? []).map((row) => [row.student_id, row]));

  const studentRows = (students ?? []) as StudentRow[];

  const records: AdminAttendanceRecord[] = studentRows.map((student) => {
    const attendanceRow = attendanceByStudentId.get(student.id);
    const status =
      attendanceRow?.status === 'present' ? ('present' as const) : ('absent' as const);

    return {
      student_id: student.id,
      name: getStudentName(student),
      status,
      marked_at: formatMarkedAt(attendanceRow?.marked_at ?? null),
      accuracy: null,
    };
  });

  const present = records.filter((r) => r.status === 'present').length;

  return {
    date,
    summary: {
      total: records.length,
      present,
      absent: records.length - present,
    },
    records,
  };
}
