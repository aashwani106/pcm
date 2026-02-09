import { supabaseAdmin } from '../config/supabase';

export async function findProfileRoleById(userId: string) {
  return supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();
}

export async function listProfiles(limit = 100) {
  return supabaseAdmin
    .from('profiles')
    .select('id, role, full_name, created_at')
    .limit(limit)
    .order('created_at', { ascending: false });
}
