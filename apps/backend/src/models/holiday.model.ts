import { supabaseAdmin } from '../config/supabase';

export async function findHolidayByDate(date: string) {
  return supabaseAdmin
    .from('holidays')
    .select('date')
    .eq('date', date)
    .limit(1)
    .maybeSingle();
}

export async function listHolidaysBetween(startDate: string, endDate: string) {
  return supabaseAdmin
    .from('holidays')
    .select('date')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
}
