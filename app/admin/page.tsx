'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, Shield, UserPlus, Activity, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Clock, Circle as XCircle, ArrowRight, LayoutDashboard, TriangleAlert, ClipboardList, Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/admin/StatCard';
import { MaintenancePanel } from '@/components/admin/MaintenancePanel';
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

interface KbDriftState {
  drifted: boolean;
  buildVersion: string;
  indexedVersion: string | null;
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
  const { role } = useAuth();
  const isReviewer = role === 'reviewer';
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
  const [kbDrift, setKbDrift] = useState<KbDriftState | null>(null);
  const [kbSeeding, setKbSeeding] = useState(false);

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  useEffect(() => {
    if (isReviewer) return;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/agents/admin/kb-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const body = (await res.json()) as {
        drifted?: boolean;
        buildVersion?: string;
        indexedVersion?: string | null;
      };
      setKbDrift({
        drifted: Boolean(body.drifted),
        buildVersion: body.buildVersion ?? '—',
        indexedVersion: body.indexedVersion ?? null,
      });
    })();
  }, [isReviewer]);

  const handleKbReseed = async () => {
    setKbSeeding(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/agents/admin/seed-kb', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setKbDrift((prev) =>
          prev ? { ...prev, drifted: false, indexedVersion: prev.buildVersion } : prev
        );
      }
    } finally {
      setKbSeeding(false);
    }
  };

  return (
    <>
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl tone-info shrink-0">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif tracking-tight text-foreground">
              {t.admin.overviewTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.admin.overviewSubtitle}</p>
          </div>
        </div>

        {kbDrift?.drifted && (
          <div className="notice tone-warning mb-8 flex items-start gap-3 px-4 py-3.5">
            <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                {t.admin.overviewKbDriftBanner
                  .replace('{indexed}', kbDrift.indexedVersion ?? '—')
                  .replace('{build}', kbDrift.buildVersion)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={kbSeeding}
              onClick={() => {
                void handleKbReseed();
              }}
              className="shrink-0"
            >
              {t.admin.overviewKbSeedAction}
            </Button>
          </div>
        )}

        {stats.parseErrorCount !== null && stats.parseErrorCount > 0 && (
          <div className="notice tone-warning mb-8 flex items-start gap-3 px-4 py-3.5">
            <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                {t.admin.overviewParseErrorBanner.replace('{count}', String(stats.parseErrorCount))}
              </p>
            </div>
            <Link
              href="/admin/biographies?screening=parse_error"
              className="shrink-0 inline-flex items-center gap-1 text-xs underline transition-colors whitespace-nowrap opacity-90 hover:opacity-100"
            >
              {t.admin.overviewViewAffected}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="space-y-10">
          {!isReviewer && <MaintenancePanel />}

          {!isReviewer && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
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
                secondary={t.admin.overviewPeriodLast7Days}
                accent="emerald"
              />
              <StatCard
                icon={<Activity className="h-5 w-5" />}
                label={t.admin.statActiveThisMonth}
                value={stats.activeThisMonth}
                secondary={t.admin.overviewPeriodLast30Days}
                accent="neutral"
              />
            </div>
          </section>
          )}

          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
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
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
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
                secondary={t.admin.overviewPeriodLast7Days}
                accent="emerald"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              {t.admin.sectionQuickActions}
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/admin/moderation">
                  <Shield className="h-4 w-4 text-brand-ink dark:text-brand-blue" />
                  {t.admin.quickActionModeration}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/admin/review">
                  <ClipboardList className="h-4 w-4 text-brand-ink dark:text-brand-blue" />
                  {t.admin.quickActionReview}
                  {(stats.underReviewBiographies ?? 0) > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs tone-warning tabular-nums">
                      {stats.underReviewBiographies}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
              {!isReviewer && (
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/admin/users">
                  <Users className="h-4 w-4 text-brand-ink dark:text-brand-blue" />
                  {t.admin.quickActionUsers}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
              )}
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/admin/biographies">
                  <BookOpen className="h-4 w-4 text-brand-ink dark:text-brand-blue" />
                  {t.admin.quickActionBiographies}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 h-10">
                <Link href="/biographies" target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 text-brand-ink dark:text-brand-blue" />
                  {t.admin.quickActionPublicCatalog}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
    </>
  );
}

export default function AdminPage() {
  return <OverviewContent />;
}
