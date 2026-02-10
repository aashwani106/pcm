import { supabase } from './supabase';

export interface MyProfile {
    id: string;
    role: 'admin' | 'student' | 'parent';
    must_change_password: boolean;
}

async function findProfileById(userId: string) {
    return supabase
        .from('profiles')
        .select('id, role, must_change_password, email')
        .eq('id', userId)
        .maybeSingle();
}

async function findProfileByEmail(email: string) {
    return supabase
        .from('profiles')
        .select('id, role, must_change_password, email')
        .eq('email', email)
        .maybeSingle();
}

export async function getMyProfile(userId: string, email?: string | null): Promise<MyProfile> {
    const byId = await findProfileById(userId);
    if (byId.error) throw byId.error;
    if (byId.data) {
        return byId.data as MyProfile;
    }

    if (!email) {
        throw new Error('Profile not found for current user');
    }

    const byEmail = await findProfileByEmail(email);
    if (byEmail.error) throw byEmail.error;
    if (!byEmail.data) {
        throw new Error('Profile not found for current user');
    }

    return byEmail.data as MyProfile;
}

export async function getUserRole(userId: string, email?: string | null) {
    const profile = await getMyProfile(userId, email);
    return profile.role;
}
