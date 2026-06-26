'use client';

import { useState, useEffect } from 'react';
import { ModerationReport, FlaggedPassage, ModerationDecision } from '@/lib/moderation/types';
import { createNotification } from '@/lib/notifications-service';
import { takeOwnership, claimReportReview, submitDecision, saveModeratorNotes, freezeBiography } from '@/lib/moderation/moderation-actions';
import type { BiographyDecisionPatch } from '@/lib/moderation/moderation-actions';
import { sendAuthorEmailFromClient } from '@/lib/client/send-author-email';
import type { EmailTemplateId } from '@/lib/server/email';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ReportTypeBadge } from './ReportTypeBadge';
import { ReportStatusBadge } from './ReportStatusBadge';
import { ExternalLink, TriangleAlert as AlertTriangle, FileText, MessageSquare, BookOpen, CircleAlert as AlertCircle, Snowflake } from 'lucide-react';

interface ModerationDetailPanelProps {
  report: ModerationReport | null;
  onClose: () => void;
  onRefresh: () => void;
}

type DialogType = 'approve' | 'publishWarning' | 'return' | 'remove' | 'freeze' | null;

const BIOGRAPHY_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sections_complete: 'Sections Complete',
  final_version: 'Final Version',
  pdf_draft: 'PDF draft',
  locked_pending_screening: 'Pending screening',
  under_review: 'Under Review',
  published: 'Published',
  removed: 'Removed',
};

export function ModerationDetailPanel({ report, onClose, onRefresh }: ModerationDetailPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [returnMessage, setReturnMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [lockWarning, setLockWarning] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState(false);

  useEffect(() => {
    if (!report || !user) return;

    setNotes(report.moderator_notes?.text ?? '');
    setNotesSaved(false);
    setDialog(null);
    setReturnMessage('');
    setLockWarning(null);
    setConflictError(false);

    if (report.status !== 'in_review' && report.status !== 'assigned') return;

    const assignedId = report.assigned_moderator_id ?? report.assigned_to;
    if (assignedId && assignedId !== user.id) return;

    claimReportReview(report.id, user.id).then((result) => {
      if (!result.claimed && result.error === null) {
        const name = result.claimedByName ?? t.admin.reportLockedByOtherFallback;
        setLockWarning(t.admin.reportLockedByOther.replace('{name}', name));
      }
    });
    if (report) {
      setNotes(report.moderator_notes?.text ?? '');
      setNotesSaved(false);
      setDialog(null);
      setReturnMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when report id changes (avoid duplicate claimReview on unrelated reference updates)
  }, [report?.id]);

  if (!report) return null;

  const moderatorId = report.assigned_moderator_id ?? report.assigned_to;
  const isAssignedToMe = moderatorId === user?.id;
  const isUnassigned = report.status === 'unassigned';
  const needsTakeOwnership =
    isUnassigned || (report.status === 'assigned' && isAssignedToMe);
  const canAct = report.status === 'in_review' && isAssignedToMe && !lockWarning;
  const isDecided = report.status === 'decided';

  const flaggedPassages: FlaggedPassage[] = Array.isArray(report.ai_analysis?.flagged_passages)
    ? report.ai_analysis.flagged_passages
    : [];
  const hasUserReportContent =
    report.reporter_id != null || Boolean(report.description?.trim());
  const isReaderReport = report.reporter_id != null;
  const wasPublished = report.biography_status === 'published';
  const readerReportOnPublished = isReaderReport && wasPublished;

  function formatReportDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleTakeOwnership() {
    if (!user) return;
    setSubmitting(true);
    const { error } = await takeOwnership(report!.id, user.id);
    setSubmitting(false);
    if (error) {
      toast({ title: t.admin.moderationActionError, description: error, variant: 'destructive' });
      return;
    }
    onRefresh();
  }

  async function handleFreeze() {
    if (!user || !report) return;
    setSubmitting(true);
    setConflictError(false);

    const freezeResult = await freezeBiography(report.biography_id);
    if (freezeResult.error) {
      setSubmitting(false);
      toast({ title: t.admin.moderationActionError, description: freezeResult.error, variant: 'destructive' });
      return;
    }

    const closeResult = await submitDecision(
      report.id,
      report.biography_id,
      report.biography_author_id!,
      'no_action',
      null,
      '',
      user.id,
    );

    setSubmitting(false);
    setDialog(null);

    if (closeResult.conflict) {
      setConflictError(true);
      toast({ title: t.admin.moderationConflictError, variant: 'destructive' });
      return;
    }

    if (closeResult.error) {
      toast({ title: t.admin.moderationActionError, description: closeResult.error, variant: 'destructive' });
      return;
    }

    await createNotification(report.biography_author_id!, t.admin.bioNotifyFrozen);
    void sendAuthorEmailFromClient({
      userId: report.biography_author_id!,
      templateId: 'admin_bio_frozen',
      biographyId: report.biography_id,
    });

    toast({ title: t.admin.bioActionSuccess });
    onRefresh();
    onClose();
  }

  async function handleDecision(type: DialogType) {
    if (!type || !user || !report) return;
    setSubmitting(true);
    setConflictError(false);

    let decision: ModerationDecision;
    let bioPatch: BiographyDecisionPatch | null = null;
    let notificationMessage: string;
    const now = new Date().toISOString();

    switch (type) {
      case 'approve':
        if (readerReportOnPublished) {
          decision = 'no_action';
          bioPatch = null;
          notificationMessage = '';
        } else {
          decision = 'publish';
          bioPatch = { status: 'published', published_at: now };
          notificationMessage = t.admin.notifyPublished;
        }
        break;
      case 'publishWarning':
        decision = 'publish_warning';
        if (readerReportOnPublished) {
          bioPatch = null;
        } else {
          bioPatch = { status: 'published', published_at: now };
        }
        notificationMessage = t.admin.notifyPublishedWarning;
        break;
      case 'return':
        decision = 'returned';
        if (readerReportOnPublished) {
          bioPatch = {
            status: 'published',
            is_frozen: true,
            frozen_at: now,
            frozen_reason: 'moderation_report',
          };
          notificationMessage = returnMessage.trim() || t.admin.notifyFrozenFromReport;
        } else {
          bioPatch = { status: 'draft' };
          notificationMessage = returnMessage.trim() || t.admin.notifyReturned;
        }
        break;
      case 'remove':
        decision = 'removed';
        bioPatch = { status: 'removed' };
        notificationMessage = t.admin.notifyRemoved;
        break;
      default:
        setSubmitting(false);
        return;
    }

    const result = await submitDecision(
      report.id,
      report.biography_id,
      report.biography_author_id!,
      decision,
      bioPatch,
      notificationMessage,
      user.id,
    );

    setSubmitting(false);

    if (result.conflict) {
      setConflictError(true);
      toast({ title: t.admin.moderationConflictError, variant: 'destructive' });
      return;
    }

    if (result.error) {
      toast({ title: t.admin.moderationActionError, description: result.error, variant: 'destructive' });
      return;
    }

    setDialog(null);

    const templateByType: Partial<Record<NonNullable<DialogType>, EmailTemplateId>> = {
      approve: readerReportOnPublished ? undefined : 'publication_published',
      publishWarning: 'publication_published_warning',
      return: readerReportOnPublished ? 'admin_bio_frozen' : 'publication_returned',
      remove: 'publication_removed',
    };

    const templateId = templateByType[type];
    if (templateId) {
      void sendAuthorEmailFromClient({
        userId: report.biography_author_id!,
        templateId,
        biographyId: report.biography_id,
        vars:
          type === 'return' && returnMessage.trim()
            ? { reviewerMessage: returnMessage.trim() }
            : undefined,
      });
    }

    onRefresh();
    onClose();
  }

  async function handleSaveNotes() {
    if (!report) return;
    setSavingNotes(true);
    await saveModeratorNotes(report.id, notes);
    setSavingNotes(false);
    setNotesSaved(true);
  }

  const bioUrl = `/biography/${report.biography_id}/view`;

  return (
    <>
      <Sheet open={!!report} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold text-foreground">
                {t.admin.panelReportInfo}
              </SheetTitle>
              <ReportStatusBadge status={report.status} />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto divide-y divide-border">

            {(lockWarning || conflictError) && (
              <div className="px-6 py-4 space-y-2">
                {lockWarning && (
                  <div className="flex items-start gap-3 rounded-lg border border-brand-mustardDark/45 bg-brand-mustardLight/45 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-brand-mustardDark dark:text-brand-mustardLight mt-0.5 shrink-0" />
                    <p className="text-sm text-brand-ink dark:text-brand-beigeLight">{lockWarning}</p>
                  </div>
                )}
                {conflictError && (
                  <div className="flex items-start gap-3 rounded-lg border border-brand-wine/40 bg-brand-wine/10 dark:bg-brand-wine/20 dark:border-brand-wine/45 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-brand-wine dark:text-brand-beigeLight mt-0.5 shrink-0" />
                    <p className="text-sm text-brand-wineDark dark:text-brand-beigeLight">
                      {t.admin.moderationConflictError}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 1 – Biography Info */}
            <section className="px-6 py-5 space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                {t.admin.panelBiographyInfo}
              </h3>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {report.biography_title ?? t.admin.unknownBiography}
                </p>
                <p className="text-xs text-muted-foreground">
                  {report.biography_author ?? t.admin.unknownAuthor}
                </p>
              </div>

              {report.biography_status && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t.admin.biographyStatus}:</span>
                  <span className="text-xs font-medium text-foreground">
                    {BIOGRAPHY_STATUS_LABELS[report.biography_status] ?? report.biography_status}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => window.open(bioUrl, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t.admin.viewBiography}
              </Button>
            </section>

            {/* SECTION 2 – Report Info */}
            <section className="px-6 py-5 space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t.admin.panelReportInfo}
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <ReportTypeBadge type={report.report_type} />
                {report.ai_violation_level != null && (
                  <span className="text-xs text-muted-foreground">
                    {t.admin.aiViolationLevel}: <span className="font-semibold text-foreground">{report.ai_violation_level}</span>
                  </span>
                )}
              </div>

              {hasUserReportContent && (
                <div className="space-y-2 rounded-lg border border-brand-mustardDark/45 bg-brand-mustardLight/40 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.admin.userReportDetails}
                  </p>
                  {report.reporter_email && (
                    <p className="text-xs">
                      <span className="font-medium text-muted-foreground">{t.admin.reporterEmail}:</span>{' '}
                      <span className="text-foreground">{report.reporter_email}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{t.admin.reportedAt}:</span>{' '}
                    <span className="text-foreground">{formatReportDate(report.created_at)}</span>
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">{t.admin.reporterDetails}:</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {report.description?.trim() ? report.description : t.admin.noReportDescription}
                  </p>
                </div>
              )}

              {report.ai_analysis?.summary && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t.admin.aiSummaryFull}</p>
                  <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-lg p-3">
                    {report.ai_analysis.summary}
                  </p>
                </div>
              )}

              {flaggedPassages.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t.admin.flaggedPassages}</p>
                <div className="space-y-2">
                    {flaggedPassages.map((fp, i) => (
                      <div
                        key={i}
                        className="rounded-lg border-l-4 border-brand-mustardDark bg-brand-mustardLight/50 dark:bg-brand-mustardDark/25 dark:border-brand-mustardLight px-3 py-2.5 space-y-1"
                      >
                        <p className="text-xs text-foreground italic leading-relaxed">
                          {`\u201C${fp.text}\u201D`}
                        </p>
                        {fp.reason && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">{t.admin.flaggedPassageReason}:</span> {fp.reason}
                          </p>
                        )}
                        {fp.level != null && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">{t.admin.flaggedPassageLevel}:</span> {fp.level}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
              )}

            </section>

            {/* SECTION 3 – Moderator Actions */}
            <section className="px-6 py-5 space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {t.admin.panelActions}
              </h3>

              {isDecided && (
                <p className="text-xs text-muted-foreground italic">
                  Decision: <span className="font-medium text-foreground">{report.decision}</span>
                </p>
              )}

              {needsTakeOwnership && (
                <Button
                  className="w-full"
                  onClick={handleTakeOwnership}
                  disabled={submitting}
                >
                  {submitting ? t.admin.takingOwnership : t.admin.takeOwnership}
                </Button>
              )}

              {(report.status === 'in_review' || report.status === 'assigned') &&
                !isAssignedToMe &&
                moderatorId && (
                <p className="text-xs text-muted-foreground italic">{t.admin.assignedToOther}</p>
              )}

              {canAct && (
                <div className="space-y-2">
                  {readerReportOnPublished && (
                    <p className="text-xs text-muted-foreground leading-relaxed rounded-lg bg-muted/40 px-3 py-2">
                      {t.admin.moderationReaderReportHint}
                    </p>
                  )}

                  <Button
                    className="w-full bg-brand-greenDark hover:bg-brand-ink text-brand-paper"
                    onClick={() => setDialog('approve')}
                    disabled={submitting}
                  >
                    {readerReportOnPublished ? t.admin.dismissReportKeepPublished : t.admin.approveAndPublish}
                  </Button>

                  <Button
                    className="w-full bg-brand-mustardDark hover:bg-brand-mustardDark/90 text-brand-ink"
                    onClick={() => setDialog('publishWarning')}
                    disabled={submitting}
                  >
                    {t.admin.publishWithWarning}
                  </Button>

                  {readerReportOnPublished && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 border-brand-blue/60 text-brand-ink hover:bg-brand-blue/25 dark:border-brand-blue/45 dark:text-brand-beigeLight dark:hover:bg-brand-blue/15"
                      onClick={() => setDialog('freeze')}
                      disabled={submitting}
                    >
                      <Snowflake className="h-4 w-4" />
                      {t.admin.bioActionFreeze}
                    </Button>
                  )}

                  <div className="space-y-2">
                    <Textarea
                      value={returnMessage}
                      onChange={(e) => setReturnMessage(e.target.value)}
                      placeholder={t.admin.messageToAuthorPlaceholder}
                      rows={3}
                      className="text-sm resize-none"
                    />
                    <Button
                      variant="outline"
                      className="w-full border-brand-mustardDark text-brand-ink hover:bg-brand-mustardLight/50 dark:border-brand-mustardLight dark:text-brand-beigeLight dark:hover:bg-brand-mustardDark/30"
                      onClick={() => {
                        if (returnMessage.trim()) setDialog('return');
                      }}
                      disabled={submitting || !returnMessage.trim()}
                    >
                      {readerReportOnPublished ? t.admin.freezeAndNotifyAuthor : t.admin.returnToAuthor}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-brand-wine text-brand-wineDark hover:bg-brand-wine/10 dark:border-brand-wine dark:text-brand-beigeLight dark:hover:bg-brand-wine/20"
                    onClick={() => setDialog('remove')}
                    disabled={submitting}
                  >
                    {t.admin.removeBiography}
                  </Button>
                </div>
              )}
            </section>

            {/* SECTION 4 – Internal Notes */}
            <section className="px-6 py-5 space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {t.admin.panelInternalNotes}
              </h3>

              <Textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                placeholder={t.admin.internalNotesPlaceholder}
                rows={4}
                className="text-sm resize-none"
              />

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? t.admin.savingNotes : notesSaved ? t.admin.notesSaved : t.admin.saveNotes}
              </Button>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Approve AlertDialog */}
      <AlertDialog open={dialog === 'approve'} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {readerReportOnPublished ? t.admin.confirmDismissReport : t.admin.confirmApprove}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {readerReportOnPublished ? t.admin.confirmDismissReportDetail : t.admin.confirmApproveDetail}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog(null)}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brand-greenDark hover:bg-brand-ink text-brand-paper"
              onClick={() => handleDecision('approve')}
            >
              {t.admin.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish with warning AlertDialog */}
      <AlertDialog open={dialog === 'publishWarning'} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.confirmPublishWarning}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.confirmPublishWarningDetail}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog(null)}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brand-mustardDark hover:bg-brand-mustardDark/90 text-brand-ink"
              onClick={() => handleDecision('publishWarning')}
            >
              {t.admin.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return to author AlertDialog */}
      <AlertDialog open={dialog === 'return'} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {readerReportOnPublished ? t.admin.confirmFreezeAndNotify : t.admin.confirmReturn}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {readerReportOnPublished ? t.admin.confirmFreezeAndNotifyDetail : t.admin.confirmReturnDetail}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog(null)}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brand-mustardDark hover:bg-brand-mustardDark/90 text-brand-ink"
              onClick={() => handleDecision('return')}
            >
              {t.admin.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove AlertDialog */}
      <AlertDialog open={dialog === 'remove'} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.confirmRemove}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.confirmRemoveDetail}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog(null)}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brand-wineDark hover:bg-brand-wine text-brand-paper"
              onClick={() => handleDecision('remove')}
            >
              {t.admin.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === 'freeze'} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.bioActionFreezeConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.moderationFreezeWhileReviewingDetail}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog(null)}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brand-blue text-brand-paper hover:bg-brand-blue/90"
              onClick={() => handleFreeze()}
            >
              {t.admin.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
