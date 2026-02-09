import { listAttendanceByDate } from '../models/attendance.model';
import {
  listNotificationsByParent,
  markNotificationRead,
  upsertAbsentNotifications,
} from '../models/notification.model';
import { listStudents } from '../models/student.model';
import { ApiError } from '../utils/ApiError';

export interface AbsentNotificationRunResult {
  date: string;
  absent_students: number;
  eligible_parents: number;
  created_notifications: number;
}

export async function runAbsentParentNotifications(date: string): Promise<AbsentNotificationRunResult> {
  const [{ data: students, error: studentsError }, { data: attendance, error: attendanceError }] =
    await Promise.all([listStudents(), listAttendanceByDate(date)]);

  if (studentsError) {
    throw new ApiError(500, 'Failed to load students for notifications', studentsError);
  }

  if (attendanceError) {
    throw new ApiError(500, 'Failed to load attendance for notifications', attendanceError);
  }

  const presentStudentIds = new Set(
    (attendance ?? [])
      .filter((row) => row.status === 'present')
      .map((row) => row.student_id)
  );
  const allStudents = students ?? [];

  const absentStudents = allStudents.filter((student) => !presentStudentIds.has(student.id));
  const eligibleTargets = absentStudents.filter((student) => !!student.parent_id);

  const rows = eligibleTargets.map((student) => ({
    parent_user_id: student.parent_id as string,
    student_id: student.id,
    date,
    type: 'attendance_absent' as const,
    title: 'Attendance Alert',
    message: `Your student (${student.id.slice(0, 8)}) is marked absent on ${date}.`,
  }));

  const { data: insertedRows, error: insertError } = await upsertAbsentNotifications(rows);
  if (insertError) {
    throw new ApiError(500, 'Failed to create notifications', insertError);
  }

  return {
    date,
    absent_students: absentStudents.length,
    eligible_parents: eligibleTargets.length,
    created_notifications: insertedRows?.length ?? 0,
  };
}

export async function getParentNotifications(parentUserId: string, limit?: number) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Number(limit), 1), 200) : 100;

  const { data, error } = await listNotificationsByParent(parentUserId, safeLimit);
  if (error) {
    throw new ApiError(500, 'Failed to load notifications', error);
  }

  return data ?? [];
}

export async function readParentNotification(parentUserId: string, notificationId: string) {
  const { data, error } = await markNotificationRead(notificationId, parentUserId);
  if (error) {
    throw new ApiError(500, 'Failed to mark notification as read', error);
  }

  if (!data) {
    throw new ApiError(404, 'Notification not found');
  }

  return { id: data.id, is_read: true };
}
