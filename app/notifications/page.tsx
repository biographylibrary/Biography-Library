'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type UserNotification,
} from '@/lib/notifications-service';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { it, de, fr, enUS, type Locale } from 'date-fns/locale';

const dateLocales: Record<string, Locale> = { en: enUS, it, fr, de };

export default function NotificationsPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await fetchNotifications(user.id);
    setNotifications(data);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const locale = dateLocales[language] ?? enUS;

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = new Date().getTime() - date.getTime();
      if (diffMs < 60_000) return t.notifications.justNow;
      return formatDistanceToNow(date, { addSuffix: true, locale });
    } catch {
      return '';
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-2.5">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t.notifications.title}</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-16">
          <div className="rounded-full bg-muted p-4">
            <Bell className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm max-w-sm">{t.notifications.empty}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'relative rounded-xl border px-4 py-3.5 transition-colors',
                notification.is_read
                  ? 'border-border/50 bg-card'
                  : 'border-border bg-card shadow-sm'
              )}
            >
              {!notification.is_read && (
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand-blue shrink-0" />
              )}
              <div className={cn('flex items-start justify-between gap-3', !notification.is_read && 'pl-4')}>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-relaxed', !notification.is_read && 'font-medium')}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.created_at)}</p>
                </div>
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleMarkRead(notification.id)}
                    title={t.notifications.markAsRead}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
