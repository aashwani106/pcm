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
    .select('date, status, marked_at, marked_by, remark')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
}
