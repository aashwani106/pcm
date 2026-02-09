import { supabase } from './supabase';

/**
 * Returns today's date as YYYY-MM-DD in local timezone (for Supabase date comparison).
 */
function getTodayLocalDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Read-only: Is today a holiday? (Frontend → Supabase)
 * Expects table: holidays with column "date" (date type).
 */
export async function isTodayHoliday(): Promise<boolean> {
    const today = getTodayLocalDateString();
    const { data, error } = await supabase
        .from('holidays')
        .select('date')
        .eq('date', today)
        .limit(1)
        .maybeSingle();

    if (error) return false;
    return data != null;
}

/**
 * Read-only: Has this student already marked attendance today? (Frontend → Supabase)
 * Expects table: attendance with columns student_id, date.
 * studentId = auth user id (profiles.id).
 */
export async function hasAttendanceToday(studentId: string): Promise<boolean> {
    const today = getTodayLocalDateString();
    const { data, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', today)
        .limit(1)
        .maybeSingle();

    if (error) return false;
    return data != null;
}
