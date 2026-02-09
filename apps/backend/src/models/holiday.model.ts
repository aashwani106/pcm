import { supabaseAdmin } from '../config/supabase';

export async function findHolidayByDate(date: string) {
  return supabaseAdmin
    .from('holidays')
    .select('date')
    .eq('date', date)
    .limit(1)
    .maybeSingle();
}
