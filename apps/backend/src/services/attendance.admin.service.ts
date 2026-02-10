import { listAttendanceByDate } from '../models/attendance.model';
import { listProfilesByIds } from '../models/profile.model';
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

function getStudentLabel(student: StudentRow, emailByUserId: Map<string, string>): string {
  if (student.user_id) {
    const email = emailByUserId.get(student.user_id);
    if (email) return email;
  }
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
  const profileIds = studentRows
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id));
  const { data: profiles, error: profilesError } = profileIds.length
    ? await listProfilesByIds(profileIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new ApiError(500, 'Failed to load profile emails', profilesError);
  }

  const emailByUserId = new Map(
    (profiles ?? [])
      .filter((p) => typeof p.email === 'string' && p.email.trim().length > 0)
      .map((p) => [p.id, p.email as string])
  );

  const records: AdminAttendanceRecord[] = studentRows.map((student) => {
    const attendanceRow = attendanceByStudentId.get(student.id);
    const status =
      attendanceRow?.status === 'present' ? ('present' as const) : ('absent' as const);

    return {
      student_id: student.id,
      name: getStudentLabel(student, emailByUserId),
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
