import {
  findStudentByUserId,
  listStudentsByParentUserId,
  StudentRow,
} from '../models/student.model';
import { ApiError } from '../utils/ApiError';
import { getStudentAttendanceCalendar, StudentAttendanceCalendarResult } from './attendance.calendar.service';

export interface ParentAttendanceCalendarResult {
  selected_student_id: string;
  children: Array<{
    id: string;
    name: string;
    batch: string | null;
  }>;
  calendar: StudentAttendanceCalendarResult;
}

function toDisplayName(student: StudentRow): string {
  return `Student ${student.id.slice(0, 8)}`;
}

export async function getStudentSelfAttendanceCalendar(userId: string, month: string) {
  const { data: student, error } = await findStudentByUserId(userId);
  if (error) {
    throw new ApiError(500, 'Failed to load student account', error);
  }
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  return getStudentAttendanceCalendar(student.id, month);
}

export async function getParentAttendanceCalendar(
  parentUserId: string,
  month: string,
  requestedStudentId?: string
): Promise<ParentAttendanceCalendarResult> {
  const { data: students, error } = await listStudentsByParentUserId(parentUserId);
  if (error) {
    throw new ApiError(500, 'Failed to load parent students', error);
  }
  const children = students ?? [];
  if (children.length === 0) {
    throw new ApiError(404, 'No students linked to this parent');
  }

  const selected =
    (requestedStudentId
      ? children.find((s) => s.id === requestedStudentId)
      : null) ?? children[0];

  if (!selected) {
    throw new ApiError(404, 'Selected student not found for this parent');
  }

  const calendar = await getStudentAttendanceCalendar(selected.id, month);

  return {
    selected_student_id: selected.id,
    children: children.map((child) => ({
      id: child.id,
      name: toDisplayName(child),
      batch: child.batch ?? null,
    })),
    calendar,
  };
}
