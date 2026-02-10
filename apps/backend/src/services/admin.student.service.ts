import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

type StudentStatus = 'active' | 'paused' | 'left';

interface StudentListItem {
  student_id: string;
  full_name: string;
  batch: string | null;
  class_level: string | null;
  status: StudentStatus;
  last_attendance_at: string | null;
}

interface StudentDetail {
  student_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  class_level: string | null;
  batch_id: string | null;
  roll_number: string | null;
  status: StudentStatus;
  attendance_enabled: boolean;
  remark: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  admission_date: string | null;
  created_at: string | null;
  last_attendance_at: string | null;
}

function normalizeStatus(row: Record<string, unknown>): StudentStatus {
  const raw = typeof row.status === 'string' ? row.status.toLowerCase() : null;
  if (raw === 'active' || raw === 'paused' || raw === 'left') {
    return raw;
  }

  if (typeof row.is_active === 'boolean') {
    return row.is_active ? 'active' : 'paused';
  }

  return 'active';
}

function studentName(row: Record<string, unknown>, profile?: Record<string, unknown> | null) {
  const fullName = typeof profile?.full_name === 'string' ? profile.full_name.trim() : '';
  if (fullName) return fullName;
  const email = typeof profile?.email === 'string' ? profile.email.trim() : '';
  if (email) return email;
  const id = typeof row.id === 'string' ? row.id : '';
  return id ? `Student ${id.slice(0, 8)}` : 'Student';
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getProfilesMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Record<string, unknown>>();

  let data: Record<string, unknown>[] | null = null;
  let error: { message?: string } | null = null;

  const withFullName = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  if (!withFullName.error) {
    data = (withFullName.data ?? []) as Record<string, unknown>[];
  } else {
    const emailOnly = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    if (!emailOnly.error) {
      data = (emailOnly.data ?? []) as Record<string, unknown>[];
    } else {
      error = emailOnly.error;
    }
  }

  if (error) {
    throw new ApiError(500, 'Failed to load student profiles', error);
  }

  return new Map<string, Record<string, unknown>>(
    (data ?? []).map((row) => [String((row as { id: string }).id), row as Record<string, unknown>])
  );
}

export async function getAdminStudentList(): Promise<StudentListItem[]> {
  const { data, error } = await supabaseAdmin.from('students').select('*').order('created_at', {
    ascending: false,
  });

  if (error) {
    throw new ApiError(500, 'Failed to load students', error);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const userIds = rows
    .map((row) => (typeof row.user_id === 'string' ? row.user_id : null))
    .filter((v): v is string => Boolean(v));
  const profilesById = await getProfilesMap(userIds);

  return rows.map((row) => {
    const id = String(row.id);
    const userId = typeof row.user_id === 'string' ? row.user_id : null;
    const profile = userId ? profilesById.get(userId) ?? null : null;

    return {
      student_id: id,
      full_name: studentName(row, profile),
      batch: asNullableString(row.batch) ?? asNullableString(row.batch_id),
      class_level: asNullableString(row.class_level),
      status: normalizeStatus(row),
      last_attendance_at: asNullableString(row.last_attendance_at),
    };
  });
}

export async function getAdminStudentDetail(studentId: string): Promise<StudentDetail> {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, 'Failed to load student', error);
  }
  if (!data) {
    throw new ApiError(404, 'Student not found');
  }

  const row = data as Record<string, unknown>;
  const userId = typeof row.user_id === 'string' ? row.user_id : null;
  let profile: Record<string, unknown> | null = null;
  let parentProfile: Record<string, unknown> | null = null;

  if (userId) {
    const withFullName = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (!withFullName.error) {
      profile = (withFullName.data as Record<string, unknown> | null) ?? null;
    } else {
      const emailOnly = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();
      profile = (emailOnly.data as Record<string, unknown> | null) ?? null;
    }
  }

  const parentId = typeof row.parent_id === 'string' ? row.parent_id : null;
  if (parentId) {
    const parentLookup = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', parentId)
      .maybeSingle();
    if (!parentLookup.error) {
      parentProfile = (parentLookup.data as Record<string, unknown> | null) ?? null;
    } else {
      const parentEmailOnly = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('id', parentId)
        .maybeSingle();
      parentProfile = (parentEmailOnly.data as Record<string, unknown> | null) ?? null;
    }
  }

  return {
    student_id: String(row.id),
    user_id: userId,
    full_name: studentName(row, profile),
    email: asNullableString(profile?.email),
    class_level: asNullableString(row.class_level),
    batch_id: asNullableString(row.batch_id) ?? asNullableString(row.batch),
    roll_number: asNullableString(row.roll_number),
    status: normalizeStatus(row),
    attendance_enabled:
      typeof row.attendance_enabled === 'boolean' ? row.attendance_enabled : true,
    remark: asNullableString(row.remark),
    parent_name: asNullableString(row.parent_name) ?? asNullableString(parentProfile?.full_name),
    parent_phone: asNullableString(row.parent_phone) ?? asNullableString(parentProfile?.phone),
    parent_email: asNullableString(row.parent_email) ?? asNullableString(parentProfile?.email),
    admission_date:
      asNullableString(row.admission_date) ??
      asNullableString(row.joined_at) ??
      null,
    created_at: asNullableString(row.created_at),
    last_attendance_at: asNullableString(row.last_attendance_at),
  };
}

export async function updateAdminStudentCoreInfo(input: {
  studentId: string;
  full_name?: string;
  class_level?: string | null;
  batch_id?: string | null;
  roll_number?: string | null;
  status?: StudentStatus;
  attendance_enabled?: boolean;
  remark?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', input.studentId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(500, 'Failed to load student', existingError);
  }
  if (!existing) {
    throw new ApiError(404, 'Student not found');
  }

  const row = existing as Record<string, unknown>;
  const available = new Set(Object.keys(row));
  const studentUpdates: Record<string, unknown> = {};

  if (input.class_level !== undefined && available.has('class_level')) {
    studentUpdates.class_level = input.class_level;
  }

  if (input.batch_id !== undefined) {
    if (available.has('batch_id')) {
      studentUpdates.batch_id = input.batch_id;
    } else if (available.has('batch')) {
      studentUpdates.batch = input.batch_id;
    }
  }

  if (input.roll_number !== undefined && available.has('roll_number')) {
    studentUpdates.roll_number = input.roll_number;
  }

  if (input.status !== undefined) {
    if (available.has('status')) {
      studentUpdates.status = input.status;
    }
    if (available.has('is_active')) {
      studentUpdates.is_active = input.status === 'active';
    }
  }

  if (input.attendance_enabled !== undefined && available.has('attendance_enabled')) {
    studentUpdates.attendance_enabled = input.attendance_enabled;
  }

  if (input.remark !== undefined && available.has('remark')) {
    studentUpdates.remark = input.remark;
  }

  if (input.parent_name !== undefined && available.has('parent_name')) {
    studentUpdates.parent_name = input.parent_name;
  }

  if (input.parent_phone !== undefined && available.has('parent_phone')) {
    studentUpdates.parent_phone = input.parent_phone;
  }

  if (input.parent_email !== undefined && available.has('parent_email')) {
    studentUpdates.parent_email = input.parent_email;
  }

  if (Object.keys(studentUpdates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update(studentUpdates)
      .eq('id', input.studentId);
    if (updateError) {
      throw new ApiError(500, 'Failed to update student', updateError);
    }
  }

  const userId = typeof row.user_id === 'string' ? row.user_id : null;
  if (input.full_name !== undefined && userId) {
    const fullNameUpdate = await supabaseAdmin
      .from('profiles')
      .update({ full_name: input.full_name })
      .eq('id', userId);

    if (fullNameUpdate.error) {
      // Backward-compatible mode for schemas without `profiles.full_name`.
      if ((fullNameUpdate.error as { code?: string }).code !== '42703') {
        throw new ApiError(500, 'Failed to update student profile', fullNameUpdate.error);
      }
    }
  }

  return getAdminStudentDetail(input.studentId);
}
