'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, Shield, UserPlus, Activity, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Clock, Circle as XCircle, ArrowRight, LayoutDashboard, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';

interface OverviewStats {
  totalUsers: number | null;
  newUsersThisWeek: number | null;
  activeThisMonth: number | null;
  totalBiographies: number | null;
  publishedBiographies: number | null;
  underReviewBiographies: number | null;
  removedBiographies: number | null;
  openReports: number | null;
  inReviewReports: number | null;
  resolvedThisWeek: number | null;
  parseErrorCount: number | null;
}

async function safeCount(query: any): Promise<number | null> {
  try {
    const result = await query;
    return result.count ?? null;
  } catch {
    return null;
  }
}

async function fetchStats(): Promise<OverviewStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsers,
    newUsersThisWeek,
    activeThisMonth,
    totalBiographies,
    publishedBiographies,
    underReviewBiographies,
    removedBiographies,
    openReports,
    inReviewReports,
    resolvedThisWeek,
    parseErrorCount,
  ] = await Promise.all([
    safeCount(supabase.from('profiles').select('id', { count: 'exact', head: true })),
    safeCount(supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo)),
    safeCount(supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo)),
    safeCount(supabase.from('biographies').select('id', { count: 'exact', head: true })),
    safeCount(supabase.from('biographies').select('id', { count: 'exact', head: true }).eq('status', 'published')),
    safeCount(supabase.from('biographies').select('id', { count: 'exact', head: true }).eq('status', 'under_review')),
    safeCount(supabase.from('biographies').select('id', { count: 'exact', head: true }).eq('status', 'removed')),
    safeCount(supabase.from('moderation_reports').select('id', { count: 'exact', head: true }).eq('status', 'unassigned')),
    safeCount(supabase.from('moderation_reports').select('id', { count: 'exact', head: true }).eq('status', 'in_review')),
    safeCount(
      supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'decided')
        .gte('updated_at', sevenDaysAgo)
    ),
    safeCount(
      supabase
        .from('biographies')
        .select('id', { count: 'exact', head: true })
        .eq('ai_screening_status', 'parse_error')
        .eq('status', 'published')
        .gte('created_at', sevenDaysAgo)
    ),
  ]);

  return {
    totalUsers,
    newUsersThisWeek,
    activeThisMonth,
    totalBiographies,
    publishedBiographies,
    underReviewBiographies,
    removedBiographies,
    openReports,
    inReviewReports,
    resolvedThisWeek,
    parseErrorCount,
  };
}

function OverviewContent() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: null,
    newUsersThisWeek: null,
    activeThisMonth: null,
    totalBiographies: null,
    publishedBiographies: null,
    underReviewBiographies: null,
    removedBiographies: null,
    openReports: null,
    inReviewReports: null,
    resolvedThisWeek: null,
    parseErrorCount: null,
  });

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  return (
    <div className="min-h-full bg-background">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 shrink-0">
            <LayoutDashboard className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
              {t.admin.overviewTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.admin.overviewSubtitle}</p>
          </div>
        </div>

        {stats.parseErrorCount !== null && stats.parseErrorCount > 0 && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3.5">
            <TriangleAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {stats.parseErrorCount} {stats.parseErrorCount === 1 ? 'biography' : 'biographies'} published in the last 7 days bypassed AI screening due to a parse error. These may require manual review.
              </p>
            </div>
            <Link
              href="/admin/biographies?screening=parse_error"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors whitespace-nowrap"
            >
              View affected biographies
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="space-y-10">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {t.admin.sectionUsers}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label={t.admin.statTotalUsers}
                value={stats.totalUsers}
                accent="sky"
              />
              <StatCard
                icon={<UserPlus className="h-5 w-5" />}
                label={t.admin.statNewThisWeek}
                value={stats.newUsersThisWeek}
                secondary="Last 7 days"
                accent="emerald"
              />
              <StatCard
                icon={<Activity className="h-5 w-5" />}
                label={t.admin.statActiveThisMonth}
                value={stats.activeThisMonth}
                secondary="Last 30 days"
                accent="neutral"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {t.admin.sectionBiographies}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<BookOpen className="h-5 w-5" />}
                label={t.admin.statTotalBiographies}
                value={stats.totalBiographies}
                accent="sky"
              />
              <StatCard
                icon={<CheckCircle className="h-5 w-5" />}
                label={t.admin.statPublished}
                value={stats.publishedBiographies}
                accent="emerald"
              />
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                label={t.admin.statUnderReview}
                value={stats.underReviewBiographies}
                accent="amber"
              />
              <StatCard
                icon={<XCircle className="h-5 w-5" />}
                label={t.admin.statRemoved}
                value={stats.removedBiographies}
                accent="red"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {t.admin.sectionModeration}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<AlertCircle className="h-5 w-5" />}
                label={t.admin.statOpenReports}
                value={stats.openReports}
                accent="red"
              />
              <StatCard
                icon={<Shield className="h-5 w-5" />}
                label={t.admin.statInReview}
                value={stats.inReviewReports}
                accent="amber"
              />
              <StatCard
                icon={<CheckCircle className="h-5 w-5" />}
                label={t.admin.statResolvedThisWeek}
                value={stats.resolvedThisWeek}
                secondary="Last 7 days"
                accent="emerald"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {t.admin.sectionQuickActions}
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/admin/moderation">
                  <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  {t.admin.quickActionModeration}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/admin/users">
                  <Users className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  {t.admin.quickActionUsers}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/admin/biographies">
                  <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  {t.admin.quickActionBiographies}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <OverviewContent />
    </AdminGuard>
  );
}
