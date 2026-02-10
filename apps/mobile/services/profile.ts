import { supabase } from './supabase';

export interface MyProfile {
    id: string;
    role: 'admin' | 'student' | 'parent';
    must_change_password: boolean;
}

export async function getUserRole(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data.role;
}

export async function getMyProfile(userId: string): Promise<MyProfile> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, role, must_change_password')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data as MyProfile;
}
