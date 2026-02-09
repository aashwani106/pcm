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

export { getReadableErrorMessage };
