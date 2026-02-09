export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  student_id: string;
  date: string;
  status: AttendanceStatus;
  marked_at: string | null;
}
