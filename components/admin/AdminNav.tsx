'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Shield, BookOpen, Users, ChartBar as BarChart3, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  superAdminOnly?: boolean;
  adminOnly?: boolean;
}

export function AdminNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { role } = useAuth();
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    supabase
      .from('biographies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'under_review')
      .then(({ count }) => setReviewCount(count ?? 0));
  }, []);

  const items: NavItem[] = [
    { label: t.admin.navOverview, href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: t.admin.navModeration, href: '/admin/moderation', icon: <Shield className="h-4 w-4" /> },
    { label: t.admin.navBiographies, href: '/admin/biographies', icon: <BookOpen className="h-4 w-4" /> },
    {
      label: t.admin.navReview,
      href: '/admin/review',
      icon: <ClipboardList className="h-4 w-4" />,
      badge: reviewCount > 0 ? reviewCount : undefined,
    },
    { label: t.admin.navUsers, href: '/admin/users', icon: <Users className="h-4 w-4" />, adminOnly: true },
    { label: t.admin.navAiStats, href: '/admin/ai-stats', icon: <BarChart3 className="h-4 w-4" />, adminOnly: true },
  ];

  const visible = items.filter((item) => {
    if (item.superAdminOnly && role !== 'super_admin') return false;
    if (item.adminOnly && role !== 'admin' && role !== 'super_admin') return false;
    return true;
  });

  return (
    <nav className="border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {visible.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-[#6D323E] bg-[#6D323E] text-white rounded-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {item.icon}
                {item.label}
                {item.badge !== undefined && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#DDCF88] text-[#121212]'
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
