import { supabaseAdmin } from '../config/supabase';

export interface StudentRow {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  batch: string | null;
  status?: string | null;
  attendance_enabled?: boolean | null;
  last_attendance_at?: string | null;
  created_at: string | null;
}

export async function listStudents() {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, status, attendance_enabled, last_attendance_at, created_at')
    .order('id', { ascending: true });
}

export async function findStudentById(studentId: string) {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, status, attendance_enabled, last_attendance_at, created_at')
    .eq('id', studentId)
    .maybeSingle();
}

export async function findStudentByUserId(userId: string) {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, status, attendance_enabled, last_attendance_at, created_at')
    .eq('user_id', userId)
    .maybeSingle();
}

export async function listStudentsByUserId(userId: string) {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, status, attendance_enabled, last_attendance_at, created_at')
    .eq('user_id', userId)
    .limit(2);
}

export async function listStudentsByParentUserId(parentUserId: string) {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, status, attendance_enabled, last_attendance_at, created_at')
    .eq('parent_id', parentUserId)
    .order('created_at', { ascending: true });
}

export async function touchStudentLastAttendanceAt(studentId: string) {
  return supabaseAdmin
    .from('students')
    .update({ last_attendance_at: new Date().toISOString() })
    .eq('id', studentId)
    .select('id')
    .single();
}
