'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardList, ExternalLink, CircleCheck as CheckCircle, Circle as XCircle, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications-service';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ReviewBiography {
  id: string;
  title: string;
  author_name: string;
  author_id: string;
  content_language: string | null;
  biography_type: string | null;
  slug: string | null;
  updated_at: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ReviewQueueContent() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ReviewBiography[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('biographies')
      .select('id, title, author_name, user_id, content_language, biography_type, slug, updated_at')
      .eq('status', 'under_review')
      .order('updated_at', { ascending: true });

    if (error) {
      setLoadError(t.admin.reviewLoadError);
    } else {
      setItems(
        (data ?? []).map((b: any) => ({
          id: b.id,
          title: b.title ?? '',
          author_name: b.author_name ?? '',
          author_id: b.user_id,
          content_language: b.content_language ?? null,
          biography_type: b.biography_type ?? null,
          slug: b.slug ?? null,
          updated_at: b.updated_at,
        }))
      );
    }
    setLoading(false);
  }, [t.admin.reviewLoadError]);

  useEffect(() => {
    load();
  }, [load]);

  const viewHref = (bio: ReviewBiography) =>
    `/biography/${bio.slug || bio.id}/view`;

  const handleApprove = async (bio: ReviewBiography) => {
    setActionLoading(bio.id);
    const { error } = await supabase
      .from('biographies')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', bio.id);

    if (error) {
      setActionLoading(null);
      alert(t.admin.reviewApproveError);
      return;
    }

    await createNotification(bio.author_id, t.notifications.biographyApproved);
    setItems((prev) => prev.filter((b) => b.id !== bio.id));
    setActionLoading(null);
  };

  const openReject = (bio: ReviewBiography) => {
    setRejectOpenId(bio.id);
    setRejectReason('');
    setReasonError('');
  };

  const cancelReject = () => {
    setRejectOpenId(null);
    setRejectReason('');
    setReasonError('');
  };

  const handleConfirmReject = async (bio: ReviewBiography) => {
    if (rejectReason.trim().length < 10) {
      setReasonError(t.admin.reviewReasonRequired);
      return;
    }

    setActionLoading(bio.id);
    const { error } = await supabase
      .from('biographies')
      .update({ status: 'draft' })
      .eq('id', bio.id);

    if (error) {
      setActionLoading(null);
      alert(t.admin.reviewRejectError);
      return;
    }

    await createNotification(
      bio.author_id,
      t.notifications.biographyRejected + rejectReason.trim()
    );
    setItems((prev) => prev.filter((b) => b.id !== bio.id));
    setRejectOpenId(null);
    setRejectReason('');
    setActionLoading(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-[#DDCF88]/30 dark:bg-[#DDCF88]/20 shrink-0">
            <ClipboardList className="h-5 w-5 text-[#121212] dark:text-[#FDFBF7]" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
              {t.admin.reviewPageTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.admin.reviewPageSubtitle}</p>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </div>
        )}

        {!loading && items.length === 0 && !loadError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-muted/50">
              <Inbox className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t.admin.reviewEmpty}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">{t.admin.reviewEmptySubtitle}</p>
          </div>
        )}

        {(loading || items.length > 0) && (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.reviewColTitle}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t.admin.reviewColAuthor}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t.admin.reviewColLanguage}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t.admin.reviewColType}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t.admin.reviewColSubmitted}</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t.admin.reviewColRead}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.admin.reviewColActions}</th>
                  </tr>
                </thead>
                {loading
                  ? (
                    <tbody className="divide-y divide-border">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3"><div className="h-4 w-44 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                          <td className="px-4 py-3"><div className="h-8 w-8 bg-muted rounded animate-pulse mx-auto" /></td>
                          <td className="px-4 py-3"><div className="h-8 w-40 bg-muted rounded animate-pulse ml-auto" /></td>
                        </tr>
                      ))}
                    </tbody>
                  )
                  : items.map((bio) => (
                    <tbody key={bio.id} className="border-b border-border last:border-b-0">
                      <tr className={cn(
                        'hover:bg-muted/30 transition-colors',
                        rejectOpenId === bio.id && 'bg-muted/20'
                      )}>
                        <td className="px-4 py-3 max-w-[220px]">
                          <span className="font-medium text-foreground truncate block">
                            {bio.title.slice(0, 50)}{bio.title.length > 50 ? '…' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground truncate max-w-[160px]">
                          {bio.author_name || '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground uppercase tracking-wide">
                          {bio.content_language ?? '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {bio.biography_type === 'memorial'
                            ? t.admin.bioTypeDeceased
                            : t.admin.bioTypeAutobiography}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                          {fmtDate(bio.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={viewHref(bio)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={t.admin.reviewColRead}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              disabled={actionLoading === bio.id}
                              onClick={() => handleApprove(bio)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {t.admin.reviewApprove}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                              disabled={actionLoading === bio.id}
                              onClick={() =>
                                rejectOpenId === bio.id ? cancelReject() : openReject(bio)
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {t.admin.reviewReject}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {rejectOpenId === bio.id && (
                        <tr>
                          <td colSpan={7} className="px-6 pb-5 pt-3 bg-muted/10">
                            <div className="max-w-xl space-y-3">
                              <div className="space-y-1.5">
                                <Label htmlFor={`reason-${bio.id}`} className="text-sm font-medium">
                                  {t.admin.reviewReasonLabel}
                                </Label>
                                <Textarea
                                  id={`reason-${bio.id}`}
                                  placeholder={t.admin.reviewReasonPlaceholder}
                                  value={rejectReason}
                                  onChange={(e) => {
                                    setRejectReason(e.target.value);
                                    if (reasonError) setReasonError('');
                                  }}
                                  rows={3}
                                  className="resize-none text-sm"
                                />
                                {reasonError && (
                                  <p className="text-xs text-destructive">{reasonError}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs"
                                  disabled={actionLoading === bio.id}
                                  onClick={() => handleConfirmReject(bio)}
                                >
                                  {t.admin.reviewConfirmReject}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  disabled={actionLoading === bio.id}
                                  onClick={cancelReject}
                                >
                                  {t.admin.reviewCancelReject}
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  ))}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReviewPage() {
  return (
    <AdminGuard>
      <ReviewQueueContent />
    </AdminGuard>
  );
}
