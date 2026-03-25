import { supabase } from '@/lib/supabase';

export interface UserNotification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(userId: string): Promise<UserNotification[]> {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export async function createNotification(userId: string, message: string): Promise<void> {
  await supabase.from('user_notifications').insert({ user_id: userId, message });
}
