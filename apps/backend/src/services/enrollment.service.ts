import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { createUserByAdmin } from './user.service';

type EnrollmentStatus = 'pending' | 'approved' | 'rejected';

interface EnrollmentRequestInput {
  student_name: string;
  student_email: string;
  class_level: string;
  stream: 'PCM' | 'PCB' | 'Science';
  board: 'CBSE' | 'ICSE' | 'UP';
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  previous_marks?: number | null;
  city?: string | null;
}

const VALID_CLASSES = new Set(['6', '7', '8', '9', '10', '11', '12']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9\s()-]{10,18}$/;

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function authUserExistsByEmail(email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new ApiError(500, 'Failed to validate enrollment email', error);
    }

    const users = data?.users ?? [];
    if (users.some((user) => (user.email ?? '').toLowerCase() === email)) {
      return true;
    }

    if (users.length < perPage) {
      return false;
    }
    page += 1;
  }

  return false;
}

export async function submitEnrollmentRequest(input: EnrollmentRequestInput) {
  const studentName = sanitizeString(input.student_name);
  const studentEmail = sanitizeString(input.student_email).toLowerCase();
  const classLevel = sanitizeString(input.class_level);
  const stream = sanitizeString(input.stream) as EnrollmentRequestInput['stream'];
  const board = sanitizeString(input.board) as EnrollmentRequestInput['board'];
  const parentName = sanitizeString(input.parent_name);
  const parentPhone = sanitizeString(input.parent_phone);
  const parentEmail = sanitizeString(input.parent_email).toLowerCase();
  const city = sanitizeString(input.city ?? null) || null;

  if (!studentName || !studentEmail || !classLevel || !stream || !board || !parentName || !parentPhone || !parentEmail) {
    throw new ApiError(400, 'Missing required enrollment fields');
  }

  if (!EMAIL_REGEX.test(studentEmail) || !EMAIL_REGEX.test(parentEmail)) {
    throw new ApiError(400, 'Invalid email format');
  }

  if (!PHONE_REGEX.test(parentPhone)) {
    throw new ApiError(400, 'Invalid phone format');
  }

  if (!VALID_CLASSES.has(classLevel)) {
    throw new ApiError(400, 'class_level must be between 6 and 12');
  }

  if (!['PCM', 'PCB', 'Science'].includes(stream)) {
    throw new ApiError(400, 'Invalid stream');
  }

  if (!['CBSE', 'ICSE', 'UP'].includes(board)) {
    throw new ApiError(400, 'Invalid board');
  }

  const { data: pendingEnrollment, error: pendingError } = await supabaseAdmin
    .from('enrollment_requests')
    .select('id, student_email, parent_email')
    .eq('status', 'pending')
    .or(`student_email.eq.${studentEmail},parent_email.eq.${parentEmail}`)
    .limit(1);

  if (pendingError) {
    throw new ApiError(500, 'Failed to validate duplicate enrollments', pendingError);
  }
  if ((pendingEnrollment ?? []).length > 0) {
    throw new ApiError(409, 'A pending enrollment request already exists for this email');
  }

  const { data: existingProfiles, error: existingProfilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .or(`email.eq.${studentEmail},email.eq.${parentEmail}`)
    .limit(1);

  if (existingProfilesError) {
    throw new ApiError(500, 'Failed to validate existing users', existingProfilesError);
  }
  if ((existingProfiles ?? []).length > 0) {
    throw new ApiError(409, 'An account already exists for student or parent email');
  }

  const [studentExistsInAuth, parentExistsInAuth] = await Promise.all([
    authUserExistsByEmail(studentEmail),
    authUserExistsByEmail(parentEmail),
  ]);

  if (studentExistsInAuth || parentExistsInAuth) {
    throw new ApiError(409, 'An account already exists for student or parent email');
  }

  const previousMarks =
    typeof input.previous_marks === 'number' && Number.isFinite(input.previous_marks)
      ? Math.max(0, Math.min(100, Number(input.previous_marks.toFixed(2))))
      : null;

  const { data, error } = await supabaseAdmin
    .from('enrollment_requests')
    .insert({
      student_name: studentName,
      student_email: studentEmail,
      class_level: classLevel,
      stream,
      board,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      previous_marks: previousMarks,
      city,
      status: 'pending' as EnrollmentStatus,
    })
    .select('id, status, created_at')
    .single();

  if (error?.code === '23505') {
    throw new ApiError(409, 'A pending enrollment request already exists for this email');
  }
  if (error || !data) {
    throw new ApiError(500, 'Failed to submit enrollment request', error);
  }

  return data;
}

export async function listEnrollmentRequests(status?: EnrollmentStatus) {
  let query = supabaseAdmin
    .from('enrollment_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    throw new ApiError(500, 'Failed to load enrollment requests', error);
  }

  return data ?? [];
}

export async function approveEnrollmentRequest(requestId: string, adminUserId: string) {
  const { data: requestRow, error: requestError } = await supabaseAdmin
    .from('enrollment_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (requestError || !requestRow) {
    throw new ApiError(404, 'Enrollment request not found');
  }

  if (requestRow.status !== 'pending') {
    throw new ApiError(400, `Enrollment request already ${requestRow.status}`);
  }

  const parent = await createUserByAdmin({
    email: requestRow.parent_email,
    role: 'parent',
  });

  const student = await createUserByAdmin({
    email: requestRow.student_email,
    role: 'student',
    parent_id: parent.user_id,
    batch: `Class ${requestRow.class_level}`,
  });

  const { error: updateError } = await supabaseAdmin
    .from('enrollment_requests')
    .update({
      status: 'approved',
      processed_by: adminUserId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    throw new ApiError(500, 'Request approved but failed to update enrollment status', updateError);
  }

  return {
    request_id: requestId,
    status: 'approved' as const,
    parent_account: {
      email: parent.email,
      temporary_password: parent.temporary_password,
    },
    student_account: {
      email: student.email,
      temporary_password: student.temporary_password,
      student_id: student.student_id,
    },
  };
}

export async function rejectEnrollmentRequest(
  requestId: string,
  adminUserId: string,
  reason?: string | null
) {
  const { data: requestRow, error: requestError } = await supabaseAdmin
    .from('enrollment_requests')
    .select('id, status')
    .eq('id', requestId)
    .single();

  if (requestError || !requestRow) {
    throw new ApiError(404, 'Enrollment request not found');
  }

  if (requestRow.status !== 'pending') {
    throw new ApiError(400, `Enrollment request already ${requestRow.status}`);
  }

  const { error: updateError } = await supabaseAdmin
    .from('enrollment_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason?.trim() || null,
      processed_by: adminUserId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    throw new ApiError(500, 'Failed to reject enrollment request', updateError);
  }

  return {
    request_id: requestId,
    status: 'rejected' as const,
  };
}
