import { supabaseAdmin } from '../config/supabase';

export interface StudentRow {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  batch: string | null;
  created_at: string | null;
}

export async function listStudents() {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, created_at')
    .order('id', { ascending: true });
}

export async function findStudentById(studentId: string) {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, created_at')
    .eq('id', studentId)
    .maybeSingle();
}

export async function findStudentByUserId(userId: string) {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, created_at')
    .eq('user_id', userId)
    .maybeSingle();
}

export async function listStudentsByParentUserId(parentUserId: string) {
  return supabaseAdmin
    .from('students')
    .select('id, user_id, parent_id, batch, created_at')
    .eq('parent_id', parentUserId)
    .order('created_at', { ascending: true });
}
