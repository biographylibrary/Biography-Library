import { supabase } from '@/lib/supabase';

export const NOTIFICATIONS_CHANGED_EVENT = 'user-notifications-changed';

export interface UserNotification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function notifyNotificationsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count ?? 0;
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

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (!error) {
    notifyNotificationsChanged();
  }
  return !error;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (!error) {
    notifyNotificationsChanged();
  }
  return !error;
}

export async function createNotification(userId: string, message: string): Promise<void> {
  const { error } = await supabase.from('user_notifications').insert({ user_id: userId, message });
  if (!error) {
    notifyNotificationsChanged();
  }
}
