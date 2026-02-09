const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: unknown;
}

export interface MarkAttendanceData {
  studentId: string;
  date: string;
  status: 'present';
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

export async function markAttendance(accessToken: string): Promise<ApiResponse<MarkAttendanceData>> {
  const res = await fetch(`${BACKEND_URL}/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiResponse<MarkAttendanceData>(res);
}

export async function getAdminAttendance(
  accessToken: string,
  date: string
): Promise<ApiResponse<AdminAttendanceResponseData>> {
  const res = await fetch(`${BACKEND_URL}/admin/attendance?date=${encodeURIComponent(date)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiResponse<AdminAttendanceResponseData>(res);
}

export async function runAbsentNotifications(
  accessToken: string,
  date: string
): Promise<ApiResponse<AbsentNotificationsRunData>> {
  const res = await fetch(
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
  const res = await fetch(`${BACKEND_URL}/notifications/parent?limit=${limit}`, {
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
  const res = await fetch(`${BACKEND_URL}/notifications/parent/${id}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiResponse<{ id: string; is_read: boolean }>(res);
}

export { getReadableErrorMessage };
