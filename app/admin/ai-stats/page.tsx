'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BrainCircuit, Info } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { AdminNav } from '@/components/admin/AdminNav';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TimeFilter = 'today' | 'last7' | 'last30' | 'all';

interface SummaryStats {
  totalRequests: number;
  uniqueUsers: number;
  mostUsedAction: string;
  avgPerUser: number;
}

interface ActionStat {
  action: string;
  count: number;
}

interface TopUser {
  user_id: string;
  name: string;
  email: string;
  total: number;
  last_used: string | null;
}

interface DailyStat {
  date: string;
  total: number;
  unique_users: number;
}

function getWindowStart(filter: TimeFilter): string | null {
  const now = new Date();
  if (filter === 'today') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return d.toISOString();
  }
  if (filter === 'last7') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }
  if (filter === 'last30') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }
  return null;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-semibold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

function AiStatsContent() {
  const { t } = useTranslation();
  const { role } = useAuth();

  const [filter, setFilter] = useState<TimeFilter>('last7');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryStats>({ totalRequests: 0, uniqueUsers: 0, mostUsedAction: '—', avgPerUser: 0 });
  const [actionStats, setActionStats] = useState<ActionStat[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const windowStart = getWindowStart(filter);

      let query = supabase
        .from('ai_rate_limits')
        .select('user_id, action, created_at');

      if (windowStart) {
        query = query.gte('created_at', windowStart);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = data ?? [];

      const totalRequests = rows.length;
      const userSet = new Set(rows.map((r) => r.user_id));
      const uniqueUsers = userSet.size;

      const actionCounts: Record<string, number> = {};
      for (const r of rows) {
        actionCounts[r.action] = (actionCounts[r.action] ?? 0) + 1;
      }

      const mostUsedAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      const avgPerUser = uniqueUsers > 0 ? Math.round((totalRequests / uniqueUsers) * 10) / 10 : 0;

      setSummary({ totalRequests, uniqueUsers, mostUsedAction, avgPerUser });

      const actionList: ActionStat[] = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);
      setActionStats(actionList);

      const userTotals: Record<string, { total: number; last_used: string | null }> = {};
      for (const r of rows) {
        if (!userTotals[r.user_id]) {
          userTotals[r.user_id] = { total: 0, last_used: null };
        }
        userTotals[r.user_id].total++;
        if (!userTotals[r.user_id].last_used || r.created_at > userTotals[r.user_id].last_used!) {
          userTotals[r.user_id].last_used = r.created_at;
        }
      }

      const topUserIds = Object.entries(userTotals)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([id]) => id);

      let resolvedTopUsers: TopUser[] = [];
      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', topUserIds);

        const profileMap: Record<string, { name: string; email: string }> = {};
        for (const p of profiles ?? []) {
          profileMap[p.id] = { name: p.name ?? '—', email: p.email ?? '—' };
        }

        resolvedTopUsers = topUserIds.map((uid) => ({
          user_id: uid,
          name: profileMap[uid]?.name ?? '—',
          email: profileMap[uid]?.email ?? '—',
          total: userTotals[uid].total,
          last_used: userTotals[uid].last_used,
        }));
      }

      setTopUsers(resolvedTopUsers);

      const cutoff14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentRows } = await supabase
        .from('ai_rate_limits')
        .select('user_id, created_at')
        .gte('created_at', cutoff14)
        .order('created_at', { ascending: true });

      const dayMap: Record<string, { total: number; users: Set<string> }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { total: 0, users: new Set() };
      }
      for (const r of recentRows ?? []) {
        const key = r.created_at.slice(0, 10);
        if (dayMap[key]) {
          dayMap[key].total++;
          dayMap[key].users.add(r.user_id);
        }
      }

      const dailyList: DailyStat[] = Object.entries(dayMap).map(([date, val]) => ({
        date,
        total: val.total,
        unique_users: val.users.size,
      }));
      setDailyStats(dailyList);
    } catch {
      setError(t.admin.aiStatsLoadError);
    } finally {
      setLoading(false);
    }
  }, [filter, t.admin.aiStatsLoadError]);

  useEffect(() => {
    load();
  }, [load]);

  const maxActionCount = actionStats[0]?.count ?? 1;

  return (
    <div className="min-h-full bg-background">
      <AdminNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C4DAEB] dark:bg-[#C4DAEB]/20 shrink-0">
              <BrainCircuit className="h-5 w-5 text-[#121212] dark:text-[#FDFBF7]" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
                {t.admin.aiStatsPageTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t.admin.aiStatsPageSubtitle}</p>
            </div>
          </div>

          <Select value={filter} onValueChange={(v) => setFilter(v as TimeFilter)}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t.admin.aiStatsFilterToday}</SelectItem>
              <SelectItem value="last7">{t.admin.aiStatsFilterLast7}</SelectItem>
              <SelectItem value="last30">{t.admin.aiStatsFilterLast30}</SelectItem>
              <SelectItem value="all">{t.admin.aiStatsFilterAllTime}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-sky-700 dark:text-sky-300 text-sm mb-8">
          <Info className="h-4 w-4 shrink-0" />
          <span>{t.admin.aiStatsDataNote}</span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <section className="mb-10">
          <SectionHeading>{t.admin.aiStatsSection1}</SectionHeading>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t.admin.aiStatsTotalRequests}
              value={loading ? '…' : summary.totalRequests.toLocaleString()}
            />
            <StatCard
              label={t.admin.aiStatsUniqueUsers}
              value={loading ? '…' : summary.uniqueUsers.toLocaleString()}
            />
            <StatCard
              label={t.admin.aiStatsMostUsedAction}
              value={loading ? '…' : summary.mostUsedAction}
            />
            <StatCard
              label={t.admin.aiStatsAvgPerUser}
              value={loading ? '…' : summary.avgPerUser}
            />
          </div>
        </section>

        <section className="mb-10">
          <SectionHeading>{t.admin.aiStatsSection2}</SectionHeading>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : actionStats.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                {t.admin.aiStatsNoData}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {actionStats.map((a) => (
                  <div key={a.action} className="px-5 py-3 flex items-center gap-4">
                    <span className="text-sm font-mono text-foreground w-48 shrink-0">{a.action}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C4DAEB] dark:bg-[#C4DAEB] rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((a.count / maxActionCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground w-12 text-right">
                      {a.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mb-10">
          <SectionHeading>{t.admin.aiStatsSection3}</SectionHeading>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.aiStatsColName}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t.admin.aiStatsColEmail}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.admin.aiStatsColTotalRequests}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">{t.admin.aiStatsColLastUsed}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><div className="h-4 w-28 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-40 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3 text-right"><div className="h-4 w-10 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-4 py-3 hidden md:table-cell text-right"><div className="h-4 w-24 bg-muted rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : topUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {t.admin.aiStatsNoData}
                      </td>
                    </tr>
                  ) : (
                    topUsers.map((u, i) => (
                      <tr key={u.user_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs tabular-nums text-muted-foreground w-5">{i + 1}.</span>
                            <span className="font-medium text-foreground">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{u.email}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{u.total.toLocaleString()}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-right text-xs text-muted-foreground">
                          {u.last_used ? fmtDateTime(u.last_used) : t.admin.aiStatsNever}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading>{t.admin.aiStatsSection4}</SectionHeading>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.aiStatsColDate}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.admin.aiStatsColCount}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.admin.aiStatsColUniqueUsers}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 14 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-2 text-right"><div className="h-4 w-10 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-4 py-2 text-right"><div className="h-4 w-10 bg-muted rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : dailyStats.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {t.admin.aiStatsNoData}
                      </td>
                    </tr>
                  ) : (
                    [...dailyStats].reverse().map((d) => (
                      <tr
                        key={d.date}
                        className={`hover:bg-muted/30 transition-colors ${d.total === 0 ? 'opacity-50' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-foreground">
                          {fmtDate(d.date + 'T00:00:00Z')}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                          {d.total > 0 ? d.total.toLocaleString() : <span className="text-muted-foreground">0</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {d.unique_users > 0 ? d.unique_users.toLocaleString() : '0'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  const isAllowed = !loading && user && (role === 'admin' || role === 'super_admin');
  const isDenied = !loading && !isAllowed;

  useEffect(() => {
    if (!isDenied) return;
    const target = !user ? '/login' : '/admin';
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.replace(target);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isDenied, user, router]);

  if (loading) return null;

  if (isDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted-foreground">
            Access denied. Redirecting in{' '}
            <span className="font-semibold tabular-nums text-foreground">{countdown}</span>s…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminAiStatsPage() {
  return (
    <AdminOnlyGuard>
      <AiStatsContent />
    </AdminOnlyGuard>
  );
}
