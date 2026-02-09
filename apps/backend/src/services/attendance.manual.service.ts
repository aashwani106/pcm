import { findAttendanceByStudentAndDate, upsertAttendance } from '../models/attendance.model';
import { findStudentById } from '../models/student.model';
import { ApiError } from '../utils/ApiError';
import { getTodayLocalISODate } from '../utils/date';

export interface ManualAttendanceInput {
  studentId: string;
  status: 'present' | 'absent';
  remark: string;
  date?: string;
}

export async function markAttendanceManuallyByAdmin(input: ManualAttendanceInput) {
  const date = input.date ?? getTodayLocalISODate();

  const { data: student, error: studentError } = await findStudentById(input.studentId);
  if (studentError) {
    throw new ApiError(500, 'Failed to validate student', studentError);
  }
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  const { data: existing, error: existingError } = await findAttendanceByStudentAndDate(
    input.studentId,
    date
  );
  if (existingError) {
    throw new ApiError(500, 'Failed to read attendance', existingError);
  }

  const { data, error } = await upsertAttendance({
    studentId: input.studentId,
    date,
    status: input.status,
    markedAt: new Date().toISOString(),
    markedBy: 'admin',
    remark: input.remark,
  });

  if (error) {
    throw new ApiError(500, 'Failed to save manual attendance', error);
  }

  return {
    student_id: input.studentId,
    date,
    status: input.status,
    marked_by: 'admin' as const,
    remark: input.remark,
    action: existing ? ('updated' as const) : ('created' as const),
    attendance_id: data?.id ?? null,
  };
}
