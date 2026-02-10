import { supabaseAdmin } from '../config/supabase';

export async function findProfileRoleById(userId: string) {
  return supabaseAdmin
    .from('profiles')
    .select('id, role, email, must_change_password')
    .eq('id', userId)
    .single();
}

export async function listProfiles(limit = 100) {
  return supabaseAdmin
    .from('profiles')
    .select('id, role, email, must_change_password, created_at')
    .limit(limit)
    .order('created_at', { ascending: false });
}

export async function listProfilesByIds(profileIds: string[]) {
  return supabaseAdmin
    .from('profiles')
    .select('id, role, email, must_change_password')
    .in('id', profileIds);
}

export async function upsertProfileRoleAndPasswordFlag(
  userId: string,
  role: 'admin' | 'student' | 'parent',
  mustChangePassword: boolean,
  email?: string | null
) {
  return supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: userId,
        role,
        email: email ?? null,
        must_change_password: mustChangePassword,
      },
      { onConflict: 'id' }
    )
    .select('id, role, email, must_change_password')
    .single();
}

export async function clearMustChangePasswordFlag(userId: string) {
  return supabaseAdmin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userId)
    .select('id, role, email, must_change_password')
    .single();
}

export async function updateProfileEmail(userId: string, email: string | null) {
  return supabaseAdmin
    .from('profiles')
    .update({ email })
    .eq('id', userId)
    .select('id, role, email, must_change_password')
    .single();
}
