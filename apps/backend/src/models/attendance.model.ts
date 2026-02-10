import { supabaseAdmin } from '../config/supabase';

export interface AttendanceInsert {
  studentId: string;
  date: string;
  status: 'present' | 'absent';
  markedAt: string;
  markedBy: 'student' | 'admin';
  remark?: string | null;
}

export interface AttendanceByDateRow {
  student_id: string;
  status: string | null;
  marked_at: string | null;
}

export type AttendanceReviewStatus = 'accepted' | 'flagged';
export type AttendanceReviewerRole = 'admin' | 'parent';

export async function findAttendanceByStudentAndDate(studentId: string, date: string) {
  return supabaseAdmin
    .from('attendance')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('date', date)
    .maybeSingle();
}

export async function insertAttendance(input: AttendanceInsert) {
  return supabaseAdmin.from('attendance').insert({
    student_id: input.studentId,
    date: input.date,
    status: input.status,
    marked_at: input.markedAt,
    marked_by: input.markedBy,
    remark: input.remark ?? null,
  });
}

export async function upsertAttendance(input: AttendanceInsert) {
  return supabaseAdmin
    .from('attendance')
    .upsert(
      {
        student_id: input.studentId,
        date: input.date,
        status: input.status,
        marked_at: input.markedAt,
        marked_by: input.markedBy,
        remark: input.remark ?? null,
      },
      { onConflict: 'student_id,date' }
    )
    .select('id, student_id, date, status, marked_at, marked_by, remark')
    .maybeSingle();
}

export async function listAttendanceByDate(date: string) {
  return supabaseAdmin
    .from('attendance')
    .select('student_id, status, marked_at')
    .eq('date', date);
}

export async function listAttendanceForStudentBetween(
  studentId: string,
  startDate: string,
  endDate: string
) {
  return supabaseAdmin
    .from('attendance')
    .select(
      'id, date, status, marked_at, marked_by, remark, review_status, review_note, reviewed_at, reviewed_by_role, attendance_photos(photo_url, accuracy_meters, created_at)'
    )
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
}

export async function findAttendanceReviewContextById(attendanceId: string) {
  return supabaseAdmin
    .from('attendance')
    .select('id, student_id, students(parent_id)')
    .eq('id', attendanceId)
    .maybeSingle();
}

export async function updateAttendanceReview(input: {
  attendanceId: string;
  status: AttendanceReviewStatus;
  note: string | null;
  reviewerUserId: string;
  reviewerRole: AttendanceReviewerRole;
}) {
  return supabaseAdmin
    .from('attendance')
    .update({
      review_status: input.status,
      review_note: input.note,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.reviewerUserId,
      reviewed_by_role: input.reviewerRole,
    })
    .eq('id', input.attendanceId)
    .select('id, review_status, review_note, reviewed_at, reviewed_by_role')
    .single();
}

export async function findAttendancePhotoByAttendanceId(attendanceId: string) {
  return supabaseAdmin
    .from('attendance_photos')
    .select('photo_url, accuracy_meters, created_at')
    .eq('attendance_id', attendanceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}
