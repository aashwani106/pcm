import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import {
  upsertProfileRoleAndPasswordFlag,
  clearMustChangePasswordFlag,
  updateProfileEmail,
} from '../models/profile.model';
import { ApiError } from '../utils/ApiError';
import { listProfiles } from '../models/profile.model';
import { StudentRow } from '../models/student.model';

export async function getUsers(limit?: number) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Number(limit), 1), 500) : 100;
  const { data, error } = await listProfiles(safeLimit);

  if (error) {
    throw new ApiError(500, 'Failed to fetch users', error);
  }

  return data ?? [];
}

function generateTempPassword() {
  return `${randomBytes(6).toString('base64url')}A@1`;
}

export interface AdminCreateUserInput {
  email: string;
  role: 'student' | 'parent';
  batch?: string;
  parent_id?: string;
}

export interface AdminCreateUserResult {
  user_id: string;
  email: string;
  role: 'student' | 'parent';
  temporary_password: string;
  student_id: string | null;
}

export async function createUserByAdmin(input: AdminCreateUserInput): Promise<AdminCreateUserResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }
  if (input.role !== 'student' && input.role !== 'parent') {
    throw new ApiError(400, 'Role must be student or parent');
  }

  const temporaryPassword = generateTempPassword();
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    throw new ApiError(500, 'Failed to create auth user', createError);
  }

  const userId = created.user.id;

  try {
    const { error: profileError } = await upsertProfileRoleAndPasswordFlag(
      userId,
      input.role,
      true,
      email
    );
    if (profileError) {
      throw new ApiError(500, 'Failed to set profile flag', profileError);
    }

    let studentId: string | null = null;
    if (input.role === 'student') {
      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          user_id: userId,
          parent_id: input.parent_id ?? null,
          batch: input.batch ?? null,
        })
        .select('id')
        .single();

      if (studentError) {
        throw new ApiError(500, 'Auth user created but failed to create student mapping', studentError);
      }
      studentId = (studentData as Pick<StudentRow, 'id'> | null)?.id ?? null;
    }

    return {
      user_id: userId,
      email,
      role: input.role,
      temporary_password: temporaryPassword,
      student_id: studentId,
    };
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw error;
  }
}

export async function completeMyForcedPasswordChange(userId: string) {
  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!authUserError && authUserData.user) {
    await updateProfileEmail(userId, authUserData.user.email ?? null);
  }

  const { data, error } = await clearMustChangePasswordFlag(userId);
  if (error || !data) {
    throw new ApiError(500, 'Failed to clear password-change flag', error);
  }
  return {
    user_id: data.id,
    role: data.role,
    must_change_password: data.must_change_password,
  };
}
