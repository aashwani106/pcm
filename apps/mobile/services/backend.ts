const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;
const REQUEST_TIMEOUT_MS = 10000;

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: unknown;
}

export interface MarkAttendanceData {
  attendanceId: string;
  studentId: string;
  date: string;
  status: 'present';
}

export interface AttendancePhotoUploadUrlData {
  uploadUrl: string;
  photoUrl: string;
}

export interface AdminAttendanceRecord {
  student_id: string;
  name: string;
  status: 'present' | 'absent';
  marked_at: string | null;
  accuracy: number | null;
}

export interface AdminAttendanceResponseData {
  date: string;
  summary: {
    total: number;
    present: number;
    absent: number;
  };
  records: AdminAttendanceRecord[];
}

export interface AbsentNotificationsRunData {
  date: string;
  absent_students: number;
  eligible_parents: number;
  created_notifications: number;
}

export interface ParentNotification {
  id: string;
  parent_user_id: string;
  student_id: string;
  date: string;
  type: 'attendance_absent';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AttendanceWindowSummary {
  days: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface AdminStudentAttendanceHistoryData {
  student_id: string;
  name: string;
  date: string;
  attendance_percentage: number;
  last_7_days: AttendanceWindowSummary;
  last_30_days: AttendanceWindowSummary;
  absent_streak: number;
}

export interface AdminAttendanceCalendarDay {
  attendance_id: string;
  status: 'present' | 'absent';
  marked_at: string | null;
  marked_by: 'student' | 'admin' | null;
  remark: string | null;
  photo_url: string | null;
  accuracy_meters: number | null;
  review_status: 'accepted' | 'flagged' | null;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by_role: 'admin' | 'parent' | null;
}

export interface AdminStudentAttendanceCalendarData {
  student: {
    id: string;
    name: string;
    batch: string | null;
  };
  month: string;
  attendance_by_date: Record<string, AdminAttendanceCalendarDay>;
  holidays: string[];
}

export interface ParentCalendarData {
  selected_student_id: string;
  children: Array<{
    id: string;
    name: string;
    batch: string | null;
  }>;
  calendar: AdminStudentAttendanceCalendarData;
}

export interface AdminManualAttendanceInput {
  student_id: string;
  status: 'present' | 'absent';
  remark: string;
  date: string;
}

export interface AdminManualAttendanceResult {
  student_id: string;
  date: string;
  status: 'present' | 'absent';
  marked_by: 'admin';
  remark: string;
  action: 'created' | 'updated';
  attendance_id: string | null;
}

export interface AttendanceReviewInput {
  attendance_id: string;
  review_status: 'accepted' | 'flagged';
  review_note?: string;
}

export interface AttendanceReviewResult {
  attendance_id: string;
  review_status: 'accepted' | 'flagged';
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by_role: 'admin' | 'parent' | null;
}

export interface AttendancePhotoViewUrlResult {
  attendance_id: string;
  view_url: string | null;
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

export interface AdminStudentListItem {
  student_id: string;
  full_name: string;
  batch: string | null;
  class_level: string | null;
  status: 'active' | 'paused' | 'left';
  last_attendance_at: string | null;
}

export interface AdminStudentDetail {
  student_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  class_level: string | null;
  batch_id: string | null;
  roll_number: string | null;
  status: 'active' | 'paused' | 'left';
  attendance_enabled: boolean;
  remark: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  admission_date: string | null;
  created_at: string | null;
  last_attendance_at: string | null;
}

export interface AdminStudentUpdateInput {
  full_name?: string;
  class_level?: string | null;
  batch_id?: string | null;
  roll_number?: string | null;
  status?: 'active' | 'paused' | 'left';
  attendance_enabled?: boolean;
  remark?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly details: unknown;

  constructor(message: string, status: number, details: unknown = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getReadableErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  let data: ApiResponse<T> | null = null;
  try {
    data = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiRequestError('Invalid server response', res.status);
  }

  if (!res.ok || !data.success) {
    throw new ApiRequestError(data.message || 'Request failed', res.status, data.errors);
  }

  return data;
}

async function requestWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiRequestError('Request timed out. Check backend connection.', 408);
    }
    throw new ApiRequestError('Network request failed. Check backend URL/server.', 0, error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAttendancePhotoUploadUrl(
  accessToken: string,
  mimeType: string
): Promise<ApiResponse<AttendancePhotoUploadUrlData>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/attendance/photo-upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ mimeType }),
  });

  return parseApiResponse<AttendancePhotoUploadUrlData>(res);
}

export async function markAttendance(
  accessToken: string,
  input: { photoUrl: string; accuracyMeters: number | null }
): Promise<ApiResponse<MarkAttendanceData>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<MarkAttendanceData>(res);
}

export async function getAdminAttendance(
  accessToken: string,
  date: string
): Promise<ApiResponse<AdminAttendanceResponseData>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/admin/attendance?date=${encodeURIComponent(date)}`,
    {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiResponse<AdminAttendanceResponseData>(res);
}

export async function getAdminStudents(
  accessToken: string
): Promise<ApiResponse<AdminStudentListItem[]>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/admin/students`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return parseApiResponse<AdminStudentListItem[]>(res);
}

export async function getAdminStudent(
  accessToken: string,
  studentId: string
): Promise<ApiResponse<AdminStudentDetail>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/admin/students/${encodeURIComponent(studentId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return parseApiResponse<AdminStudentDetail>(res);
}

export async function updateAdminStudent(
  accessToken: string,
  studentId: string,
  input: AdminStudentUpdateInput
): Promise<ApiResponse<AdminStudentDetail>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/admin/students/${encodeURIComponent(studentId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    }
  );
  return parseApiResponse<AdminStudentDetail>(res);
}

export async function getAdminStudentAttendanceHistory(
  accessToken: string,
  studentId: string,
  date: string
): Promise<ApiResponse<AdminStudentAttendanceHistoryData>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/admin/students/${encodeURIComponent(
      studentId
    )}/attendance-history?date=${encodeURIComponent(date)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return parseApiResponse<AdminStudentAttendanceHistoryData>(res);
}

export async function getAdminStudentAttendanceCalendar(
  accessToken: string,
  studentId: string,
  month: string
): Promise<ApiResponse<AdminStudentAttendanceCalendarData>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/admin/students/${encodeURIComponent(
      studentId
    )}/attendance-calendar?month=${encodeURIComponent(month)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return parseApiResponse<AdminStudentAttendanceCalendarData>(res);
}

export async function getStudentAttendanceCalendar(
  accessToken: string,
  month: string
): Promise<ApiResponse<AdminStudentAttendanceCalendarData>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/calendar/student?month=${encodeURIComponent(month)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return parseApiResponse<AdminStudentAttendanceCalendarData>(res);
}

export async function getParentAttendanceCalendar(
  accessToken: string,
  month: string,
  studentId?: string
): Promise<ApiResponse<ParentCalendarData>> {
  const studentParam = studentId ? `&student_id=${encodeURIComponent(studentId)}` : '';
  const res = await requestWithTimeout(
    `${BACKEND_URL}/calendar/parent?month=${encodeURIComponent(month)}${studentParam}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return parseApiResponse<ParentCalendarData>(res);
}

export async function markAdminManualAttendance(
  accessToken: string,
  input: AdminManualAttendanceInput
): Promise<ApiResponse<AdminManualAttendanceResult>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/admin/attendance/manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<AdminManualAttendanceResult>(res);
}

export async function reviewAttendance(
  accessToken: string,
  input: AttendanceReviewInput
): Promise<ApiResponse<AttendanceReviewResult>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/attendance/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<AttendanceReviewResult>(res);
}

export async function getAttendancePhotoViewUrl(
  accessToken: string,
  attendanceId: string
): Promise<ApiResponse<AttendancePhotoViewUrlResult>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/attendance/${encodeURIComponent(attendanceId)}/photo-view-url`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return parseApiResponse<AttendancePhotoViewUrlResult>(res);
}

export async function runAbsentNotifications(
  accessToken: string,
  date: string
): Promise<ApiResponse<AbsentNotificationsRunData>> {
  const res = await requestWithTimeout(
    `${BACKEND_URL}/notifications/admin/absent/run?date=${encodeURIComponent(date)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return parseApiResponse<AbsentNotificationsRunData>(res);
}

export async function getParentNotifications(
  accessToken: string,
  limit = 100
): Promise<ApiResponse<ParentNotification[]>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/notifications/parent?limit=${limit}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiResponse<ParentNotification[]>(res);
}

export async function markParentNotificationRead(
  accessToken: string,
  id: string
): Promise<ApiResponse<{ id: string; is_read: boolean }>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/notifications/parent/${id}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiResponse<{ id: string; is_read: boolean }>(res);
}

export async function adminCreateManagedUser(
  accessToken: string,
  input: AdminCreateUserInput
): Promise<ApiResponse<AdminCreateUserResult>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<AdminCreateUserResult>(res);
}

export async function completeMyPasswordChange(
  accessToken: string
): Promise<ApiResponse<{ user_id: string; role: string; must_change_password: boolean }>> {
  const res = await requestWithTimeout(`${BACKEND_URL}/api/users/me/complete-password-change`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiResponse<{ user_id: string; role: string; must_change_password: boolean }>(res);
}

export { getReadableErrorMessage };
