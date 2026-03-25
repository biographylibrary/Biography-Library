'use client';

import { Bell, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import { useAuth, ADMIN_ROLES } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/language-selector';
import { FontSizeControl } from '@/components/accessibility/font-size-control';
import { Logo } from '@/components/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Header() {
  const { user, role, signOut, fontSize, setFontSize } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel(`notifications-header-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchUnreadCount(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/biographies');
  };

  const isEditorPage = pathname?.includes('/biography/') && pathname?.includes('/edit');
  const isDashboardPage = pathname === '/dashboard';
  const isDark = mounted && resolvedTheme === 'dark';
  const showAdminLink = user && role && ADMIN_ROLES.includes(role);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName = user?.user_metadata?.name || user?.email || '';
  const initials = displayName ? getInitials(displayName) : '?';

  return (
    <header className="border-b border-border bg-[#ECE9E4] dark:bg-[#1F2121] sticky top-0 z-50">
      <div className={cn(
        "h-16 flex items-center relative",
        (isEditorPage || isDashboardPage) ? "px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      )}>
        <div className="flex-1 flex items-center">
          {showAdminLink && (
            <Link
              href="/admin"
              className={cn(
                'sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname?.startsWith('/admin')
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Shield className="h-4 w-4" />
              {t.nav.admin}
            </Link>
          )}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <Link href="/biographies" className="flex items-center">
            <Logo height={48} />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-end gap-1">
          {showAdminLink && (
            <Link
              href="/admin"
              className={cn(
                'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname?.startsWith('/admin')
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              {t.nav.admin}
            </Link>
          )}

          {user && (
            <div className="hidden md:flex items-center mr-1">
              <FontSizeControl
                currentSize={fontSize}
                onSizeChange={setFontSize}
                userId={user.id}
              />
            </div>
          )}

          <LanguageSelector />

          {!user && (
            <div className="flex items-center gap-1.5 ml-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t.publicBiographies.signIn}</Link>
              </Button>
              <Button size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/register">{t.publicBiographies.startBiography}</Link>
              </Button>
            </div>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full p-0 hover:opacity-80 relative"
                >
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-foreground text-background text-xs font-semibold select-none">
                    {initials}
                  </span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal py-2.5 px-3">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.user_metadata?.name || user.email}
                  </p>
                  {user.user_metadata?.name && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-accent rounded-sm mx-1"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                >
                  <span className="text-sm">{t.nav.darkMode}</span>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-none"
                  />
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t.nav.dashboard}</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span>{t.nav.notifications}</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto text-xs font-semibold text-red-500">{unreadCount}</span>
                    )}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t.nav.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
