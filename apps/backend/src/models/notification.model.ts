import { supabaseAdmin } from '../config/supabase';

export interface NotificationInsert {
  parent_user_id: string;
  student_id: string;
  date: string;
  type: 'attendance_absent';
  title: string;
  message: string;
}

export interface ParentNotificationRow {
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

export async function upsertAbsentNotifications(rows: NotificationInsert[]) {
  if (rows.length === 0) {
    return { data: [], error: null };
  }

  return supabaseAdmin
    .from('notifications')
    .upsert(rows, {
      onConflict: 'parent_user_id,student_id,date,type',
      ignoreDuplicates: true,
    })
    .select('id');
}

export async function listNotificationsByParent(parentUserId: string, limit = 100) {
  return supabaseAdmin
    .from('notifications')
    .select('id, parent_user_id, student_id, date, type, title, message, is_read, created_at')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function markNotificationRead(notificationId: string, parentUserId: string) {
  return supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('parent_user_id', parentUserId)
    .select('id')
    .maybeSingle();
}
