'use client';

import { useState, useEffect } from 'react';
import { ModerationReport, FlaggedPassage } from '@/lib/moderation/types';
import { takeOwnership, claimReportReview, submitDecision, saveModeratorNotes } from '@/lib/moderation/moderation-actions';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth-context';
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
import { ExternalLink, TriangleAlert as AlertTriangle, FileText, MessageSquare, BookOpen, CircleAlert as AlertCircle } from 'lucide-react';

interface ModerationDetailPanelProps {
  report: ModerationReport | null;
  onClose: () => void;
  onRefresh: () => void;
}

type DialogType = 'approve' | 'publishWarning' | 'return' | 'remove' | null;

const BIOGRAPHY_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sections_complete: 'Sections Complete',
  final_version: 'Final Version',
  under_review: 'Under Review',
  published: 'Published',
  removed: 'Removed',
};

export function ModerationDetailPanel({ report, onClose, onRefresh }: ModerationDetailPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

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

    if (report.status !== 'in_review' || report.assigned_moderator_id !== user.id) return;

    claimReportReview(report.id, user.id).then((result) => {
      if (!result.claimed && result.error === null) {
        const name = result.claimedByName ?? 'another reviewer';
        setLockWarning(`This report is being reviewed by ${name}.`);
      }
    });
    if (report) {
      setNotes(report.moderator_notes?.text ?? '');
      setNotesSaved(false);
      setDialog(null);
      setReturnMessage('');
    }
  }, [report?.id]);

  if (!report) return null;

  const isAssignedToMe = report.assigned_moderator_id === user?.id;
  const isUnassigned = report.status === 'unassigned';
  const canAct = report.status === 'in_review' && isAssignedToMe && !lockWarning;
  const isDecided = report.status === 'decided';

  const flaggedPassages: FlaggedPassage[] = Array.isArray(report.ai_analysis?.flagged_passages)
    ? report.ai_analysis.flagged_passages
    : [];

  async function handleTakeOwnership() {
    if (!user) return;
    setSubmitting(true);
    await takeOwnership(report!.id, user.id);
    setSubmitting(false);
    onRefresh();
  }

  async function handleDecision(type: DialogType) {
    if (!type || !user || !report) return;
    setSubmitting(true);
    setConflictError(false);

    let decision: 'publish' | 'publish_warning' | 'returned' | 'removed';
    let biographyStatus: 'published' | 'draft' | 'removed';
    let notificationMessage: string;

    switch (type) {
      case 'approve':
        decision = 'publish';
        biographyStatus = 'published';
        notificationMessage = t.admin.notifyPublished;
        break;
      case 'publishWarning':
        decision = 'publish_warning';
        biographyStatus = 'published';
        notificationMessage = t.admin.notifyPublishedWarning;
        break;
      case 'return':
        decision = 'returned';
        biographyStatus = 'draft';
        notificationMessage = returnMessage.trim() || t.admin.notifyReturned;
        break;
      case 'remove':
        decision = 'removed';
        biographyStatus = 'removed';
        notificationMessage = t.admin.notifyRemoved;
        break;
    }

    const result = await submitDecision(
      report.id,
      report.biography_id,
      report.biography_author_id!,
      decision!,
      biographyStatus!,
      notificationMessage!,
      user.id,
    );

    setSubmitting(false);
    setDialog(null);

    if (result.conflict) {
      setConflictError(true);
      return;
    }

    if (result.error) return;

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
                  <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">{lockWarning}</p>
                  </div>
                )}
                {conflictError && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Another reviewer submitted a decision while you were reviewing. Please reload.
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

              {report.ai_analysis?.summary && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t.admin.aiSummaryFull}</p>
                  <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-lg p-3">
                    {report.ai_analysis.summary}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t.admin.flaggedPassages}</p>
                {flaggedPassages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">{t.admin.noFlaggedPassages}</p>
                ) : (
                  <div className="space-y-2">
                    {flaggedPassages.map((fp, i) => (
                      <div
                        key={i}
                        className="rounded-lg border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950/20 px-3 py-2.5 space-y-1"
                      >
                        <p className="text-xs text-foreground italic leading-relaxed">"{fp.text}"</p>
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
                )}
              </div>

              {report.report_type === 'user_report' && (
                <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                  {report.reporter_email && (
                    <p className="text-xs">
                      <span className="font-medium text-muted-foreground">{t.admin.reporterEmail}:</span>{' '}
                      <span className="text-foreground">{report.reporter_email}</span>
                    </p>
                  )}
                  {report.description && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground">{t.admin.reporterDetails}:</p>
                      <p className="text-xs text-foreground leading-relaxed">{report.description}</p>
                    </>
                  )}
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

              {isUnassigned && (
                <Button
                  className="w-full"
                  onClick={handleTakeOwnership}
                  disabled={submitting}
                >
                  {submitting ? t.admin.takingOwnership : t.admin.takeOwnership}
                </Button>
              )}

              {report.status === 'in_review' && !isAssignedToMe && (
                <p className="text-xs text-muted-foreground italic">{t.admin.assignedToOther}</p>
              )}

              {canAct && (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setDialog('approve')}
                    disabled={submitting}
                  >
                    {t.admin.approveAndPublish}
                  </Button>

                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={() => setDialog('publishWarning')}
                    disabled={submitting}
                  >
                    {t.admin.publishWithWarning}
                  </Button>

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
                      className="w-full border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                      onClick={() => {
                        if (returnMessage.trim()) setDialog('return');
                      }}
                      disabled={submitting || !returnMessage.trim()}
                    >
                      {t.admin.returnToAuthor}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
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
            <AlertDialogTitle>{t.admin.confirmApprove}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.confirmApproveDetail}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog(null)}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
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
            <AlertDialogTitle>{t.admin.confirmReturn}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.confirmReturnDetail}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialog(null)}>{t.admin.cancelAction}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600 text-white"
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
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleDecision('remove')}
            >
              {t.admin.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
