'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BiographyDetailPanel,
  AdminBiographyRow,
} from '@/components/admin/BiographyDetailPanel';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'draft' | 'published' | 'under_review' | 'removed' | 'parse_error';
type TypeFilter = 'all' | 'autobiography' | 'deceased';
type SortFilter = 'newest' | 'oldest' | 'recently_published';

function StatusBadge({ status, t }: { status: string; t: any }) {
  const map: Record<string, string> = {
    draft: 'bg-brand-beigeBg text-brand-ink border-brand-greenDark/25 dark:bg-brand-ink/35 dark:text-brand-beigeLight dark:border-brand-greenDark/40',
    published: 'bg-[#C8DFBE] text-[#121212] border-brand-greenDark/35 dark:bg-[#C8DFBE]/20 dark:text-[#C8DFBE] dark:border-brand-greenDark/45',
    under_review: 'bg-[#DDCF88] text-[#121212] border-brand-mustardDark/50 dark:bg-[#DDCF88]/20 dark:text-[#DDCF88] dark:border-brand-mustardDark/40',
    pdf_draft: 'bg-[#DDCF88]/90 text-[#121212] border-brand-mustardDark/45 dark:bg-[#DDCF88]/25 dark:text-[#DDCF88] dark:border-brand-mustardDark/35',
    locked_pending_screening:
      'bg-[#C4DAEB] text-[#121212] border-brand-blue/40 dark:bg-[#C4DAEB]/20 dark:text-[#C4DAEB] dark:border-brand-blue/35',
    removed: 'bg-[#6D323E] text-white border-brand-wine/35 dark:bg-[#6D323E] dark:text-white dark:border-brand-wine/45',
  };
  const labels: Record<string, string> = {
    draft: t.admin.bioStatusDraft,
    published: t.admin.bioStatusPublished,
    under_review: t.admin.bioStatusUnderReview,
    pdf_draft: t.admin.bioStatusPdfDraft,
    locked_pending_screening: t.admin.bioStatusLockedPendingScreening,
    removed: t.admin.bioStatusRemoved,
  };
  const cls = map[status] ?? map['draft'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function AdminBiographiesContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [biographies, setBiographies] = useState<AdminBiographyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const param = searchParams.get('screening');
    if (param === 'parse_error') return 'parse_error';
    return 'all';
  });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortFilter, setSortFilter] = useState<SortFilter>('newest');
  const [page, setPage] = useState(1);
  const [selectedBio, setSelectedBio] = useState<AdminBiographyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('biographies')
        .select(`
          id,
          title,
          user_id,
          author_name,
          status,
          visibility,
          share_token,
          created_at,
          updated_at,
          published_at,
          content_language,
          is_frozen,
          ai_screening_status,
          biography_type
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bios = data ?? [];

      const userIds = Array.from(new Set(bios.map((b: any) => b.user_id).filter(Boolean)));
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        (profileData ?? []).forEach((p: any) => {
          emailMap[p.id] = p.email;
        });
      }

      const rows: AdminBiographyRow[] = bios.map((b: any) => ({
        id: b.id,
        title: b.title ?? '',
        author_id: b.user_id,
        author_name: b.author_name || null,
        author_email: emailMap[b.user_id] ?? null,
        type: b.biography_type === 'memorial' ? 'deceased' : 'autobiography',
        status: b.status ?? 'draft',
        visibility: b.visibility ?? 'private',
        share_token: b.share_token ?? null,
        created_at: b.created_at,
        updated_at: b.updated_at,
        published_at: b.published_at ?? null,
        is_frozen: b.is_frozen ?? false,
        ai_screening_status: b.ai_screening_status ?? null,
      }));

      setBiographies(rows);
    } catch {
      setLoadError(t.admin.bioLoadError);
    } finally {
      setLoading(false);
    }
  }, [t.admin.bioLoadError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = biographies;

    if (statusFilter === 'parse_error') {
      result = result.filter((b) => b.ai_screening_status === 'parse_error');
    } else if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((b) => b.type === typeFilter);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author_name ?? '').toLowerCase().includes(q) ||
          (b.author_email ?? '').toLowerCase().includes(q)
      );
    }

    if (sortFilter === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortFilter === 'recently_published') {
      result = [...result]
        .filter((b) => b.published_at)
        .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime())
        .concat(result.filter((b) => !b.published_at));
    }

    return result;
  }, [biographies, statusFilter, typeFilter, search, sortFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleFilter() {
    setPage(1);
  }

  return (
    <div className="min-h-full bg-background">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-[#C4DAEB] dark:bg-[#C4DAEB]/20 shrink-0">
            <BookOpen className="h-5 w-5 text-[#121212] dark:text-[#FDFBF7]" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
              {t.admin.bioPageTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.admin.bioPageSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder={t.admin.bioSearchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as StatusFilter); handleFilter(); }}
          >
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder={t.admin.bioFilterStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.admin.bioFilterAll}</SelectItem>
              <SelectItem value="draft">{t.admin.bioStatusDraft}</SelectItem>
              <SelectItem value="published">{t.admin.bioStatusPublished}</SelectItem>
              <SelectItem value="under_review">{t.admin.bioStatusUnderReview}</SelectItem>
              <SelectItem value="removed">{t.admin.bioStatusRemoved}</SelectItem>
              <SelectItem value="parse_error">AI parse error</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(v) => { setTypeFilter(v as TypeFilter); handleFilter(); }}
          >
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder={t.admin.bioFilterType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.admin.bioTypeAll}</SelectItem>
              <SelectItem value="autobiography">{t.admin.bioTypeAutobiography}</SelectItem>
              <SelectItem value="deceased">{t.admin.bioTypeDeceased}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortFilter}
            onValueChange={(v) => { setSortFilter(v as SortFilter); handleFilter(); }}
          >
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder={t.admin.bioFilterSort} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.admin.bioSortNewest}</SelectItem>
              <SelectItem value="oldest">{t.admin.bioSortOldest}</SelectItem>
              <SelectItem value="recently_published">{t.admin.bioSortRecentlyPublished}</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground ml-auto tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'biography' : 'biographies'}
          </span>
        </div>

        {loadError && (
          <div className="mb-4 p-4 rounded-xl bg-brand-wine/10 dark:bg-brand-wine/15 text-sm text-brand-wineDark dark:text-brand-mustardLight">
            {loadError}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.bioColTitle}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t.admin.bioColAuthor}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t.admin.bioColType}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.bioColStatus}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t.admin.bioColCreated}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">{t.admin.bioColPublished}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.admin.bioColActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="h-4 w-40 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-20 bg-muted rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3 hidden xl:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-8 w-16 bg-muted rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      {t.admin.bioNoResults}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((bio) => (
                    <tr key={bio.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="font-medium text-foreground truncate block">
                          {bio.title.slice(0, 40)}{bio.title.length > 40 ? '…' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-sm text-foreground truncate max-w-[160px]">
                          {bio.author_name || <span className="text-muted-foreground italic">—</span>}
                        </div>
                        {bio.author_email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {bio.author_email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {bio.type === 'autobiography' ? t.admin.bioTypeAutobiography : t.admin.bioTypeDeceased}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={bio.status} t={t} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                        {fmtDate(bio.created_at)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                        {fmtDate(bio.published_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => setSelectedBio(bio)}
                        >
                          {t.admin.bioActionView}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              {t.admin.bioPrev}
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {page} {t.admin.bioPageOf} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1.5"
            >
              {t.admin.bioNext}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <BiographyDetailPanel
        biography={selectedBio}
        onClose={() => setSelectedBio(null)}
        onRefresh={() => {
          load();
          setSelectedBio(null);
        }}
      />
    </div>
  );
}

export default function AdminBiographiesPage() {
  return (
    <AdminGuard>
      <AdminBiographiesContent />
    </AdminGuard>
  );
}
