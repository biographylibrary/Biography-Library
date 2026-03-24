'use client';

import { LogOut, User, Shield } from 'lucide-react';
import { useAuth, ADMIN_ROLES } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { FontSizeControl } from '@/components/accessibility/font-size-control';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, role, signOut, fontSize, setFontSize } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const isEditorPage = pathname?.includes('/biography/') && pathname?.includes('/edit');
  const isDashboardPage = pathname === '/dashboard';

  return (
    <header className="border-b border-border bg-[#ECE9E4] dark:bg-[#1F2121] sticky top-0 z-50">
      <div className={cn(
        "h-16 flex items-center justify-between",
        (isEditorPage || isDashboardPage) ? "px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      )}>
        <div className="flex items-center gap-3">
          <Logo height={48} />
          <span className="text-lg font-serif font-semibold tracking-tight">Biography Library</span>
        </div>
        <div className="flex items-center gap-1">
          {user && role && ADMIN_ROLES.includes(role) && (
            <Link
              href="/admin"
              className={cn(
                'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
          {user && (
            <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-full bg-muted/50">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.user_metadata?.name || user.email}
              </span>
            </div>
          )}
          {user && (
            <div className="hidden md:block mr-1">
              <FontSizeControl
                currentSize={fontSize}
                onSizeChange={setFontSize}
                userId={user.id}
              />
            </div>
          )}
          <LanguageSelector />
          <ThemeToggle />
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">{t.common.signOut}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
