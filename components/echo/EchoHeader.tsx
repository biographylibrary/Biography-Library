'use client';

import Link from 'next/link';
import { BiographyPicker } from './BiographyPicker';
import type { Biography } from '@/lib/biographies';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';

interface EchoHeaderProps {
  biographies?: Biography[];
  currentBiographyId?: string;
  showPicker?: boolean;
}

export function EchoHeader({
  biographies = [],
  currentBiographyId,
  showPicker = true,
}: EchoHeaderProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut({ redirectToLogin: true });
  };

  const displayName = user?.user_metadata?.name || user?.email || '';
  const initials = displayName
    ? displayName.trim().split(/\s+/).map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        <Link
          href="/dashboard"
          className="font-serif text-base sm:text-lg font-semibold shrink-0 truncate max-w-[7.5rem] sm:max-w-none"
        >
          Biography Library
        </Link>
        {showPicker && biographies.length > 0 && (
          <BiographyPicker
            biographies={biographies}
            currentId={currentBiographyId}
            className="min-w-0 flex-1 max-w-[9rem] sm:max-w-[12.5rem] h-9 text-sm"
          />
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
        >
          {t.echo.myBiographies}
        </Link>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 rounded-full p-0">
                {initials}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  void handleSignOut();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t.nav.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
