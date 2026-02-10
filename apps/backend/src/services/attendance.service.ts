import {
  findAttendanceByStudentAndDate,
  findAttendancePhotoByAttendanceId,
  findAttendanceReviewContextById,
  insertAttendance,
  updateAttendanceReview,
  AttendanceReviewStatus,
} from '../models/attendance.model';
import { findHolidayByDate } from '../models/holiday.model';
import {
  listStudentsByUserId,
  StudentRow,
  touchStudentLastAttendanceAt,
} from '../models/student.model';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { getTodayLocalISODate } from '../utils/date';
import { getTimeWindowState, isWithinTimeWindow } from '../utils/timeWindow';
import {
  assertPhotoPathBelongsToStudent,
  getAttendancePhotoSignedViewUrl,
} from './storage.service';
import { findProfileRoleById } from '../models/profile.model';

export type AttendanceLockReasonCode =
  | 'none'
  | 'student_not_found'
  | 'student_inactive'
  | 'attendance_disabled'
  | 'window_not_started'
  | 'window_closed'
  | 'holiday'
  | 'already_marked';

export interface AttendanceMarkState {
  date: string;
  can_mark: boolean;
  reason_code: AttendanceLockReasonCode;
  reason_message: string;
  student_id: string | null;
  student_status: string | null;
  attendance_enabled: boolean | null;
  already_marked: boolean;
  is_holiday: boolean;
}

function extractParentId(studentsRelation: unknown): string | null {
  if (Array.isArray(studentsRelation)) {
    const first = studentsRelation[0] as { parent_id?: string | null } | undefined;
    return first?.parent_id ?? null;
  }
  if (studentsRelation && typeof studentsRelation === 'object') {
    return (studentsRelation as { parent_id?: string | null }).parent_id ?? null;
  }
  return null;
}

function assertStudentAttendanceState(student: StudentRow) {
  const status = (student.status ?? 'active').toString().toLowerCase();
  if (status !== 'active') {
    throw new ApiError(403, 'Attendance is disabled by admin', {
      code: 'student_inactive',
    });
  }

  if (student.attendance_enabled === false) {
    throw new ApiError(403, 'Attendance is temporarily disabled by admin', {
      code: 'attendance_disabled',
    });
  }
}

async function resolveStudentForAttendance(userId: string): Promise<StudentRow> {
  const { data, error } = await listStudentsByUserId(userId);
  if (error) {
    throw new ApiError(500, 'Failed to load student account', error);
  }

  const rows = (data ?? []) as StudentRow[];
  if (rows.length === 0) {
    throw new ApiError(404, 'Student record not found');
  }
  if (rows.length > 1) {
    throw new ApiError(409, 'Student mapping is invalid. Contact admin.');
  }

  const student = rows[0];
  assertStudentAttendanceState(student);
  return student;
}

export async function resolveStudentIdForUser(userId: string) {
  const student = await resolveStudentForAttendance(userId);
  return student.id;
}

function getReasonMessage(code: AttendanceLockReasonCode) {
  switch (code) {
    case 'student_not_found':
      return 'Student record not found. Contact admin.';
    case 'student_inactive':
      return 'Attendance is disabled by admin';
    case 'attendance_disabled':
      return 'Attendance is temporarily disabled by admin';
    case 'window_not_started':
      return 'Attendance window has not started yet';
    case 'window_closed':
      return 'Attendance window has closed for today';
    case 'holiday':
      return 'Attendance is blocked on holiday';
    case 'already_marked':
      return 'Attendance already marked for today';
    case 'none':
    default:
      return 'Attendance can be marked now';
  }
}

export async function getAttendanceMarkState(userId: string): Promise<AttendanceMarkState> {
  const today = getTodayLocalISODate();
  const { data, error } = await listStudentsByUserId(userId);
  if (error) {
    throw new ApiError(500, 'Failed to load student account', error);
  }

  const rows = (data ?? []) as StudentRow[];
  if (rows.length === 0) {
    return {
      date: today,
      can_mark: false,
      reason_code: 'student_not_found',
      reason_message: getReasonMessage('student_not_found'),
      student_id: null,
      student_status: null,
      attendance_enabled: null,
      already_marked: false,
      is_holiday: false,
    };
  }
  if (rows.length > 1) {
    throw new ApiError(409, 'Student mapping is invalid. Contact admin.');
  }

  const student = rows[0];
  const studentStatus = (student.status ?? 'active').toString().toLowerCase();
  const attendanceEnabled = student.attendance_enabled !== false;

  let reasonCode: AttendanceLockReasonCode = 'none';

  if (studentStatus !== 'active') {
    reasonCode = 'student_inactive';
  } else if (!attendanceEnabled) {
    reasonCode = 'attendance_disabled';
  } else {
    const timeWindow = getTimeWindowState();
    if (timeWindow === 'not_started') {
      reasonCode = 'window_not_started';
    } else if (timeWindow === 'closed') {
      reasonCode = 'window_closed';
    }
  }

  const { data: holiday, error: holidayError } = await findHolidayByDate(today);
  if (holidayError) {
    throw new ApiError(500, 'Failed to verify holiday', holidayError);
  }
  if (reasonCode === 'none' && holiday) {
    reasonCode = 'holiday';
  }

  let alreadyMarked = false;
  if (reasonCode === 'none') {
    const { data: existing, error: existingError } = await findAttendanceByStudentAndDate(
      student.id,
      today
    );
    if (existingError) {
      throw new ApiError(500, 'Failed to verify attendance', existingError);
    }
    alreadyMarked = Boolean(existing);
    if (alreadyMarked) {
      reasonCode = 'already_marked';
    }
  }

  return {
    date: today,
    can_mark: reasonCode === 'none',
    reason_code: reasonCode,
    reason_message: getReasonMessage(reasonCode),
    student_id: student.id,
    student_status: studentStatus,
    attendance_enabled: attendanceEnabled,
    already_marked: alreadyMarked,
    is_holiday: Boolean(holiday),
  };
}

export async function markAttendanceForStudent(userId: string) {
  const student = await resolveStudentForAttendance(userId);
  const studentId = student.id;

  if (!isWithinTimeWindow()) {
    throw new ApiError(400, 'Attendance window closed', {
      code: 'window_closed',
    });
  }

  const today = getTodayLocalISODate();

  const { data: holiday, error: holidayError } = await findHolidayByDate(today);
  if (holidayError) {
    throw new ApiError(500, 'Failed to verify holiday', holidayError);
  }
  if (holiday) {
    throw new ApiError(400, 'Attendance is blocked on holiday', {
      code: 'holiday',
    });
  }

  const { data: existing, error: existingError } = await findAttendanceByStudentAndDate(studentId, today);
  if (existingError) {
    throw new ApiError(500, 'Failed to verify attendance', existingError);
  }
  if (existing) {
    throw new ApiError(409, 'Attendance already marked', {
      code: 'already_marked',
    });
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

  const { error: touchError } = await touchStudentLastAttendanceAt(studentId);
  if (touchError) {
    throw new ApiError(500, 'Failed to update attendance marker', touchError);
  }

  return { studentId, date: today, status: 'present' as const };
}

export async function markAttendanceWithPhoto(params: {
  userId: string;
  photoUrl: string;
  accuracyMeters: number | null;
}) {
  const student = await resolveStudentForAttendance(params.userId);
  const studentId = student.id;

  if (!isWithinTimeWindow()) {
    throw new ApiError(400, 'Attendance window closed', {
      code: 'window_closed',
    });
  }

  const today = getTodayLocalISODate();

  assertPhotoPathBelongsToStudent(params.photoUrl, studentId);

  const { data: holiday, error: holidayError } = await findHolidayByDate(today);
  if (holidayError) {
    throw new ApiError(500, 'Failed to verify holiday', holidayError);
  }
  if (holiday) {
    throw new ApiError(400, 'Attendance is blocked on holiday', {
      code: 'holiday',
    });
  }

  const { data: existing, error: existingError } = await findAttendanceByStudentAndDate(studentId, today);
  if (existingError) {
    throw new ApiError(500, 'Failed to verify attendance', existingError);
  }
  if (existing) {
    throw new ApiError(409, 'Attendance already marked', {
      code: 'already_marked',
    });
  }

  const markedAt = new Date().toISOString();
  const { data: attendance, error: attendanceError } = await supabaseAdmin
    .from('attendance')
    .insert({
      student_id: studentId,
      date: today,
      status: 'present',
      marked_at: markedAt,
      marked_by: 'student',
      remark: null,
    })
    .select('id')
    .single();

  if (attendanceError || !attendance) {
    throw new ApiError(500, 'Failed to create attendance', attendanceError);
  }

  const accuracy =
    typeof params.accuracyMeters === 'number' && Number.isFinite(params.accuracyMeters)
      ? params.accuracyMeters
      : null;

  const { error: photoError } = await supabaseAdmin.from('attendance_photos').insert({
    attendance_id: attendance.id,
    photo_url: params.photoUrl,
    accuracy_meters: accuracy,
  });

  if (photoError) {
    await supabaseAdmin.from('attendance').delete().eq('id', attendance.id);
    throw new ApiError(500, 'Failed to save attendance photo', photoError);
  }

  const { error: touchError } = await touchStudentLastAttendanceAt(studentId);
  if (touchError) {
    await supabaseAdmin.from('attendance').delete().eq('id', attendance.id);
    throw new ApiError(500, 'Failed to update attendance marker', touchError);
  }

  return {
    status: 'success' as const,
    attendanceId: attendance.id,
    studentId,
    date: today,
  };
}

export async function reviewAttendanceByAdminOrParent(input: {
  userId: string;
  attendanceId: string;
  status: AttendanceReviewStatus;
  note?: string | null;
}) {
  const { data: profile, error: profileError } = await findProfileRoleById(input.userId);
  if (profileError || !profile) {
    throw new ApiError(403, 'Forbidden');
  }
  if (profile.role !== 'admin' && profile.role !== 'parent') {
    throw new ApiError(403, 'Only admin or parent can review attendance');
  }

  const { data: attendance, error: attendanceError } = await findAttendanceReviewContextById(
    input.attendanceId
  );
  if (attendanceError) {
    throw new ApiError(500, 'Failed to load attendance', attendanceError);
  }
  if (!attendance) {
    throw new ApiError(404, 'Attendance not found');
  }

  const parentId = extractParentId(attendance.students);

  if (profile.role === 'parent' && parentId !== input.userId) {
    throw new ApiError(403, 'Forbidden: attendance does not belong to your child');
  }

  const note = input.note?.trim() ? input.note.trim() : null;
  const { data: updated, error: updateError } = await updateAttendanceReview({
    attendanceId: input.attendanceId,
    status: input.status,
    note,
    reviewerUserId: input.userId,
    reviewerRole: profile.role,
  });

  if (updateError || !updated) {
    throw new ApiError(500, 'Failed to update review status', updateError);
  }

  return {
    attendance_id: updated.id,
    review_status: updated.review_status as AttendanceReviewStatus,
    review_note: updated.review_note ?? null,
    reviewed_at: updated.reviewed_at ?? null,
    reviewed_by_role: updated.reviewed_by_role as 'admin' | 'parent' | null,
  };
}

export async function getAttendancePhotoViewUrl(input: { userId: string; attendanceId: string }) {
  const { data: profile, error: profileError } = await findProfileRoleById(input.userId);
  if (profileError || !profile) {
    throw new ApiError(403, 'Forbidden');
  }

  const { data: attendance, error: attendanceError } = await findAttendanceReviewContextById(
    input.attendanceId
  );
  if (attendanceError) {
    throw new ApiError(500, 'Failed to load attendance', attendanceError);
  }
  if (!attendance) {
    throw new ApiError(404, 'Attendance not found');
  }

  const parentId = extractParentId(attendance.students);

  if (profile.role === 'student') {
    const studentId = await resolveStudentIdForUser(input.userId);
    if (attendance.student_id !== studentId) {
      throw new ApiError(403, 'Forbidden');
    }
  } else if (profile.role === 'parent' && parentId !== input.userId) {
    throw new ApiError(403, 'Forbidden');
  } else if (profile.role !== 'admin' && profile.role !== 'parent' && profile.role !== 'student') {
    throw new ApiError(403, 'Forbidden');
  }

  const { data: photo, error: photoError } = await findAttendancePhotoByAttendanceId(
    input.attendanceId
  );
  if (photoError) {
    throw new ApiError(500, 'Failed to load attendance photo', photoError);
  }
  if (!photo?.photo_url) {
    return { attendance_id: input.attendanceId, view_url: null };
  }

  const viewUrl = await getAttendancePhotoSignedViewUrl(photo.photo_url);
  return {
    attendance_id: input.attendanceId,
    view_url: viewUrl,
  };
}
