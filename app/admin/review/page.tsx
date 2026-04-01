'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardList, ExternalLink, CircleCheck as CheckCircle, Circle as XCircle, Inbox, ChevronDown, ChevronRight, TriangleAlert as AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications-service';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface FlaggedPassage {
  text: string;
  section_key: string;
  reason: string;
  severity: number;
}

interface ModerationReport {
  id: string;
  ai_analysis: {
    summary?: string;
    flagged_passages?: FlaggedPassage[];
  } | null;
  ai_violation_level: number | null;
  status: string;
}

interface ReviewBiography {
  id: string;
  title: string;
  author_name: string;
  author_id: string;
  content_language: string | null;
  biography_type: string | null;
  slug: string | null;
  updated_at: string;
  reviewed_by: string | null;
  report: ModerationReport | null;
}

type PassageDecision = 'approved' | 'rejected';

type PendingAction =
  | { type: 'approve'; bio: ReviewBiography }
  | { type: 'reject'; bio: ReviewBiography; reason: string; rejectedPassages: { section_key: string; ai_reason: string }[] };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function SeverityBadge({ severity }: { severity: number }) {
  if (severity >= 3) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 text-xs font-medium">
        Severity {severity}
      </Badge>
    );
  }
  if (severity === 2) {
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 text-xs font-medium">
        Severity {severity}
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-xs font-medium">
      Severity {severity}
    </Badge>
  );
}

function ReviewQueueContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewBiography[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [passageDecisions, setPassageDecisions] = useState<Record<string, Record<number, PassageDecision>>>({});

  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [conflictDialog, setConflictDialog] = useState<{ open: boolean; pendingAction: PendingAction | null }>({
    open: false,
    pendingAction: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data: bios, error } = await supabase
      .from('biographies')
      .select('id, title, author_name, user_id, content_language, biography_type, slug, updated_at, reviewed_by')
      .eq('status', 'under_review')
      .order('updated_at', { ascending: true });

    if (error) {
      setLoadError(t.admin.reviewLoadError);
      setLoading(false);
      return;
    }

    const biographyList = (bios ?? []).map((b: any) => ({
      id: b.id,
      title: b.title ?? '',
      author_name: b.author_name ?? '',
      author_id: b.user_id,
      content_language: b.content_language ?? null,
      biography_type: b.biography_type ?? null,
      slug: b.slug ?? null,
      updated_at: b.updated_at,
      reviewed_by: b.reviewed_by ?? null,
      report: null as ModerationReport | null,
    }));

    const withReports = await Promise.all(
      biographyList.map(async (bio) => {
        const { data: report } = await supabase
          .from('moderation_reports')
          .select('id, ai_analysis, ai_violation_level, status')
          .eq('biography_id', bio.id)
          .in('status', ['unassigned', 'assigned', 'in_review'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return { ...bio, report: (report as ModerationReport | null) ?? null };
      })
    );

    setItems(withReports);
    setLoading(false);
  }, [t.admin.reviewLoadError]);

  useEffect(() => {
    load();
  }, [load]);

  const claimReview = useCallback(async (bioId: string) => {
    if (!user?.id) return;
    await supabase
      .from('biographies')
      .update({ reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', bioId);
    setItems((prev) =>
      prev.map((b) => (b.id === bioId ? { ...b, reviewed_by: user.id } : b))
    );
  }, [user?.id]);

  const handleExpand = useCallback((bio: ReviewBiography) => {
    const isExpanded = expandedId === bio.id;
    if (isExpanded) {
      setExpandedId(null);
    } else {
      setExpandedId(bio.id);
      claimReview(bio.id);
    }
  }, [expandedId, claimReview]);

  const handleOpenReject = useCallback((bio: ReviewBiography) => {
    setRejectOpenId(bio.id);
    setRejectReason('');
    setReasonError('');
    claimReview(bio.id);
  }, [claimReview]);

  const viewHref = (bio: ReviewBiography) =>
    `/biography/${bio.slug || bio.id}/view`;

  const getFlaggedPassages = (bio: ReviewBiography): FlaggedPassage[] => {
    return bio.report?.ai_analysis?.flagged_passages ?? [];
  };

  const hasAiReport = (bio: ReviewBiography): boolean => {
    return getFlaggedPassages(bio).length > 0;
  };

  const getPassageDecisionsForBio = (bioId: string) =>
    passageDecisions[bioId] ?? {};

  const allPassagesDecided = (bio: ReviewBiography): boolean => {
    const passages = getFlaggedPassages(bio);
    if (passages.length === 0) return true;
    const decisions = getPassageDecisionsForBio(bio.id);
    return passages.every((_, idx) => decisions[idx] !== undefined);
  };

  const anyPassageRejected = (bio: ReviewBiography): boolean => {
    const decisions = getPassageDecisionsForBio(bio.id);
    return Object.values(decisions).some((d) => d === 'rejected');
  };

  const setPassageDecision = (bioId: string, idx: number, decision: PassageDecision) => {
    setPassageDecisions((prev) => ({
      ...prev,
      [bioId]: {
        ...(prev[bioId] ?? {}),
        [idx]: decision,
      },
    }));
  };

  const checkOwnership = async (bioId: string): Promise<'owned' | 'conflict' | 'free'> => {
    const { data } = await supabase
      .from('biographies')
      .select('reviewed_by')
      .eq('id', bioId)
      .maybeSingle();

    if (!data) return 'owned';
    if (!data.reviewed_by) return 'free';
    if (data.reviewed_by === user?.id) return 'owned';
    return 'conflict';
  };

  const executeApprove = async (bio: ReviewBiography, force = false) => {
    setActionLoading(bio.id);

    const updateQuery = supabase
      .from('biographies')
      .update({ status: 'published', published_at: new Date().toISOString(), reviewed_by: null, reviewed_at: null });

    const { error } = force
      ? await updateQuery.eq('id', bio.id)
      : await updateQuery.eq('id', bio.id).eq('reviewed_by', user?.id ?? '');

    if (error) {
      setActionLoading(null);
      alert(t.admin.reviewApproveError);
      return;
    }

    if (bio.report?.id) {
      await supabase
        .from('moderation_reports')
        .update({ status: 'decided', decision: 'publish', decided_at: new Date().toISOString() })
        .eq('id', bio.report.id);
    }

    await createNotification(bio.author_id, t.notifications.biographyApproved);
    setItems((prev) => prev.filter((b) => b.id !== bio.id));
    setActionLoading(null);
  };

  const executeReject = async (
    bio: ReviewBiography,
    reason: string,
    rejectedPassages: { section_key: string; ai_reason: string }[],
    force = false
  ) => {
    setActionLoading(bio.id);

    const updateQuery = supabase
      .from('biographies')
      .update({ status: 'draft', reviewed_by: null, reviewed_at: null });

    const { error } = force
      ? await updateQuery.eq('id', bio.id)
      : await updateQuery.eq('id', bio.id).eq('reviewed_by', user?.id ?? '');

    if (error) {
      setActionLoading(null);
      alert(t.admin.reviewRejectError);
      return;
    }

    if (bio.report?.id) {
      await supabase
        .from('moderation_reports')
        .update({
          status: 'decided',
          decision: 'request_edit',
          decided_at: new Date().toISOString(),
          moderator_notes: { rejectedPassages, note: reason },
        })
        .eq('id', bio.report.id);
    }

    let notificationMessage: string;
    if (rejectedPassages.length > 0) {
      const passageLines = rejectedPassages
        .map((p) => `- [${p.section_key}] ${p.ai_reason}`)
        .join('\n');
      notificationMessage = t.notifications.biographyRejectedWithPassages
        .replace('{passages}', passageLines)
        .replace('{note}', reason);
    } else {
      notificationMessage = t.notifications.biographyRejected + reason;
    }

    await createNotification(bio.author_id, notificationMessage);
    setItems((prev) => prev.filter((b) => b.id !== bio.id));
    setRejectOpenId(null);
    setRejectReason('');
    setActionLoading(null);
  };

  const handleApprove = async (bio: ReviewBiography) => {
    const ownership = await checkOwnership(bio.id);
    if (ownership === 'conflict') {
      setConflictDialog({ open: true, pendingAction: { type: 'approve', bio } });
      return;
    }
    await executeApprove(bio);
  };

  const handleApproveFromExpanded = async (bio: ReviewBiography) => {
    await claimReview(bio.id);
    await handleApprove(bio);
  };

  const cancelReject = () => {
    setRejectOpenId(null);
    setRejectReason('');
    setReasonError('');
  };

  const getRejectedPassages = (bio: ReviewBiography) => {
    const passages = getFlaggedPassages(bio);
    const decisions = getPassageDecisionsForBio(bio.id);
    return passages.filter((_, idx) => decisions[idx] === 'rejected');
  };

  const handleConfirmReject = async (bio: ReviewBiography) => {
    if (rejectReason.trim().length < 10) {
      setReasonError(t.admin.reviewReasonRequired);
      return;
    }

    const reason = rejectReason.trim();
    const rejectedPassages = getRejectedPassages(bio).map((p) => ({
      section_key: p.section_key,
      ai_reason: p.reason,
    }));

    const ownership = await checkOwnership(bio.id);
    if (ownership === 'conflict') {
      setConflictDialog({
        open: true,
        pendingAction: { type: 'reject', bio, reason, rejectedPassages },
      });
      return;
    }

    await executeReject(bio, reason, rejectedPassages);
  };

  const handleConflictProceed = async () => {
    const action = conflictDialog.pendingAction;
    setConflictDialog({ open: false, pendingAction: null });
    if (!action) return;

    if (action.type === 'approve') {
      await executeApprove(action.bio, true);
    } else {
      await executeReject(action.bio, action.reason, action.rejectedPassages, true);
    }
  };

  const handleConflictCancel = () => {
    setConflictDialog({ open: false, pendingAction: null });
  };

  return (
    <div className="min-h-full bg-background">
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-6" />
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.reviewColTitle}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t.admin.reviewColAuthor}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t.admin.reviewColLanguage}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t.admin.reviewColType}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t.admin.reviewColSubmitted}</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t.admin.reviewColRead}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.admin.reviewColActions}</th>
                  </tr>
                </thead>
                {loading ? (
                  <tbody className="divide-y divide-border">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></td>
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
                ) : (
                  items.map((bio) => {
                    const passages = getFlaggedPassages(bio);
                    const isAiReview = hasAiReport(bio);
                    const isExpanded = expandedId === bio.id;
                    const decisions = getPassageDecisionsForBio(bio.id);
                    const decided = allPassagesDecided(bio);
                    const hasRejected = anyPassageRejected(bio);
                    const takenByOther = bio.reviewed_by !== null && bio.reviewed_by !== user?.id;

                    return (
                      <tbody key={bio.id} className="border-b border-border last:border-b-0">
                        <tr
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            (rejectOpenId === bio.id || isExpanded) && 'bg-muted/20'
                          )}
                        >
                          <td className="px-4 py-3 w-6">
                            {isAiReview && (
                              <button
                                onClick={() => handleExpand(bio)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4" />
                                  : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <span className="font-medium text-foreground truncate block">
                              {bio.title.slice(0, 50)}{bio.title.length > 50 ? '…' : ''}
                            </span>
                            {isAiReview && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 block">
                                {passages.length} {t.admin.reviewFlaggedPassages}
                              </span>
                            )}
                            {takenByOther && (
                              <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                In review
                              </span>
                            )}
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
                            {!isAiReview ? (
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
                                    rejectOpenId === bio.id ? cancelReject() : handleOpenReject(bio)
                                  }
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  {t.admin.reviewReject}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {decided && !hasRejected && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                    disabled={actionLoading === bio.id}
                                    onClick={() => handleApproveFromExpanded(bio)}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    {t.admin.reviewApprove}
                                  </Button>
                                )}
                                {decided && hasRejected && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                                    disabled={actionLoading === bio.id}
                                    onClick={() =>
                                      rejectOpenId === bio.id ? cancelReject() : handleOpenReject(bio)
                                    }
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    {t.admin.reviewReject}
                                  </Button>
                                )}
                                {!decided && (
                                  <span className="text-xs text-muted-foreground italic">
                                    {passages.length - Object.keys(decisions).length} remaining
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>

                        {isAiReview && isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-6 pb-5 pt-2 bg-muted/10">
                              {decided && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-3">
                                  {t.admin.reviewAllPassagesReviewed}
                                </p>
                              )}
                              <div className="space-y-3">
                                {passages.map((passage, idx) => {
                                  const decision = decisions[idx];
                                  return (
                                    <div
                                      key={idx}
                                      className={cn(
                                        'rounded-lg border p-4 transition-colors',
                                        decision === 'approved' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20',
                                        decision === 'rejected' && 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
                                        !decision && 'border-border bg-background'
                                      )}
                                    >
                                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                          Section: {passage.section_key}
                                        </span>
                                        <SeverityBadge severity={passage.severity} />
                                      </div>

                                      <blockquote className="border-l-2 border-amber-400 dark:border-amber-600 pl-3 my-2 text-sm text-foreground italic leading-relaxed">
                                        {passage.text.length > 400
                                          ? passage.text.slice(0, 400) + '…'
                                          : passage.text}
                                      </blockquote>

                                      <p className="text-xs text-muted-foreground mt-2">
                                        <span className="font-medium text-foreground">{t.admin.reviewAiReason}:</span>{' '}
                                        {passage.reason}
                                      </p>

                                      {!decision && (
                                        <div className="flex items-center gap-2 mt-3">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                            onClick={() => setPassageDecision(bio.id, idx, 'approved')}
                                          >
                                            <CheckCircle className="h-3 w-3" />
                                            {t.admin.reviewApprovePassage}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                                            onClick={() => setPassageDecision(bio.id, idx, 'rejected')}
                                          >
                                            <XCircle className="h-3 w-3" />
                                            {t.admin.reviewRejectPassage}
                                          </Button>
                                        </div>
                                      )}

                                      {decision && (
                                        <div className="flex items-center gap-2 mt-3">
                                          <span className={cn(
                                            'text-xs font-medium',
                                            decision === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                          )}>
                                            {decision === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                          </span>
                                          <button
                                            className="text-xs text-muted-foreground underline hover:text-foreground"
                                            onClick={() => {
                                              setPassageDecisions((prev) => {
                                                const copy = { ...prev[bio.id] };
                                                delete copy[idx];
                                                return { ...prev, [bio.id]: copy };
                                              });
                                            }}
                                          >
                                            Undo
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}

                        {rejectOpenId === bio.id && (
                          <tr>
                            <td colSpan={8} className="px-6 pb-5 pt-3 bg-muted/10">
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
                    );
                  })
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={conflictDialog.open} onOpenChange={(open) => !open && handleConflictCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Another reviewer is working on this
            </AlertDialogTitle>
            <AlertDialogDescription>
              Another reviewer has this biography open. Proceeding will override their lock and submit your decision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConflictCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConflictProceed}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Proceed anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
