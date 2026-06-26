'use client';

import { Bell, BookOpen, LayoutDashboard, LogOut, Shield, Settings } from 'lucide-react';
import { useAuth, ADMIN_ROLES } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useTheme } from 'next-themes';
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
import { useEffect, useState, useCallback } from 'react';
import {
  fetchUnreadNotificationCount,
  NOTIFICATIONS_CHANGED_EVENT,
} from '@/lib/notifications-service';

export function Header() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const count = await fetchUnreadNotificationCount(user.id);
    setUnreadCount(count);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    void refreshUnreadCount();

    const onNotificationsChanged = () => {
      void refreshUnreadCount();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    };

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (user) {
      void refreshUnreadCount();
    }
  }, [pathname, user, refreshUnreadCount]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const isEditorPage = pathname?.includes('/biography/') && pathname?.includes('/edit');
  const isDashboardPage = pathname === '/dashboard';
  const isAuthPage = pathname === '/' || pathname === '/register';
  const homeHref = user ? '/dashboard' : '/';
  const isDark = mounted && resolvedTheme === 'dark';
  const showAdminLink = user && role && ADMIN_ROLES.includes(role);
  const adminLinkLabel = role === 'reviewer' ? t.nav.reviewer : t.nav.admin;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName = user?.user_metadata?.name || user?.email || '';
  const initials = displayName ? getInitials(displayName) : '?';

  return (
    <>
    <header className="border-b border-border bg-[#ECE9E4] dark:bg-[#1F2121] sticky top-0 z-50">
      <div className="h-16 flex items-center relative px-4 sm:px-6 lg:px-8">
        <div className="flex-1 flex items-center">
          {showAdminLink && (
            <Link
              href="/admin"
              className={cn(
                'sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname?.startsWith('/admin')
                  ? 'bg-[#C4DAEB] text-[#121212] dark:bg-[#C4DAEB]/30 dark:text-[#121212]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Shield className="h-4 w-4" />
              {adminLinkLabel}
            </Link>
          )}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <Link href={homeHref} className="flex items-center">
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
                  ? 'bg-[#C4DAEB] text-[#121212] dark:bg-[#C4DAEB]/30 dark:text-[#121212]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              {adminLinkLabel}
            </Link>
          )}

          {!user && !isAuthPage && (
            <div className="flex items-center gap-1.5 ml-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">{t.publicBiographies.signIn}</Link>
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
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-wine px-1 text-[10px] font-bold text-brand-paper leading-none">
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
                  <Link href="/biographies" className="flex items-center gap-2 cursor-pointer">
                    <BookOpen className="h-4 w-4" />
                    <span>{t.nav.demoBiographies}</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push('/workspace')} className="flex items-center gap-2 cursor-pointer">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t.nav.workspace}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push('/dashboard')} className="flex items-center gap-2 cursor-pointer">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t.nav.dashboard}</span>
                </DropdownMenuItem>

                {showAdminLink && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4" />
                      <span>{adminLinkLabel}</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-brand-wine px-0.5 text-[9px] font-bold text-brand-paper leading-none">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span>{t.nav.notifications}</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto text-xs font-semibold text-brand-wine dark:text-brand-mustardLight">{unreadCount}</span>
                    )}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    <span>{t.nav.settings}</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-[#121212] dark:text-[#FDFBF7] focus:text-[#121212] dark:focus:text-[#FDFBF7] focus:bg-destructive/10 cursor-pointer"
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

    </>
  );
}
