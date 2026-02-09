import { supabaseAdmin } from '../config/supabase';

export interface AttendanceInsert {
  studentId: string;
  date: string;
  status: 'present';
  markedAt: string;
}

export interface AttendanceByDateRow {
  student_id: string;
  status: string | null;
  marked_at: string | null;
}

export async function findAttendanceByStudentAndDate(studentId: string, date: string) {
  return supabaseAdmin
    .from('attendance')
    .select('id')
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
  });
}

export async function listAttendanceByDate(date: string) {
  return supabaseAdmin
    .from('attendance')
    .select('student_id, status, marked_at')
    .eq('date', date);
}
