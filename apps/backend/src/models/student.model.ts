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
