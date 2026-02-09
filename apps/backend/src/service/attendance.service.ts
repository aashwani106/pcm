import { supabaseAdmin } from '../config/supabase';
import { getTodayISODate } from '../utils/date';
import { isWithinTimeWindow } from '../utils/timeWindow';

export async function markAttendanceForStudent(studentId: string) {
  // 1) Time window
  if (!isWithinTimeWindow()) {
    return { error: 'ATTENDANCE_CLOSED' as const };
  }

  const today = getTodayISODate();

  // 2) Already marked?
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', today)
    .maybeSingle();

  if (checkErr) throw checkErr;
  if (existing) return { error: 'ALREADY_MARKED' as const };

  // 3) Insert
  const { error: insertErr } = await supabaseAdmin
    .from('attendance')
    .insert({
      student_id: studentId,
      date: today,
      status: 'present',
      marked_at: new Date().toISOString(),
    });

  if (insertErr) throw insertErr;

  return { success: true as const };
}
